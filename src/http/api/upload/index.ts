import crypto from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { Router } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { LocalUpload } from "../../../entity/upload.js";
import { config } from "../../../util/config.js";
import { route } from "../../../util/route.js";
import type { localFileJwt } from "../../../util/storage/local.js";

const router = Router({ mergeParams: true });

router.put(
	"/",
	route({ query: z.object({ t: z.jwt() }) }, async (req, res) => {
		const token = await new Promise<localFileJwt>((resolve, reject) => {
			jwt.verify(req.query.t, config().security.jwt_secret, (err, d) => {
				if (err || !d || typeof d === "string") return reject(err);
				resolve(d as localFileJwt);
			});
		});

		let target;

		if (token.target_name === "channels") target = { channel: { id: token.target_id } };
		if (token.target_name === "users") target = { user: { id: token.target_id } };

		const upload = LocalUpload.create({
			...target,

			hash: token.key.split("/").slice(-1)[0],
			width: token.width,
			height: token.height,
			mime: token.mime,
			md5: token.md5,
			size: token.size,
		});

		const p = path.join(config().storage.directory, token.key);

		await mkdir(path.dirname(p), { recursive: true });

		const destination = createWriteStream(p);

		const signer = crypto.createHash("md5");

		req.on("end", async () => {
			const md5 = signer.digest("base64");

			if (token.md5 !== md5) {
				await rm(p);
				res.sendStatus(400);
			}

			await upload.save();

			res.sendStatus(200);
		});
		req.on("error", async () => {
			await rm(p);
			res.sendStatus(500);
		});

		for await (const r of req) {
			signer.write(r);
			destination.write(r);
		}

		signer.end();
		destination.close();
	}),
);

export default router;
