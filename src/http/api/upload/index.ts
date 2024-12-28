// TODO: might want to move this into it's own http server so that it can
// be moved onto a different process by admins more easily

import { Router } from "express";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { config, route } from "../../../util";
import type { localFileJwt } from "../../../util/storage/local";

const router = Router({ mergeParams: true });

router.put(
	"/",
	route({ query: z.object({ t: z.string().jwt() }) }, async (req, res) => {
		const token = await new Promise<localFileJwt>((resolve, reject) => {
			jwt.verify(req.query.t, config.security.jwt_secret, (err, d) => {
				if (err || !d || typeof d === "string") return reject(err);
				resolve(d as localFileJwt);
			});
		});

		const p = path.join(config.storage.directory, token.key);

		await mkdir(path.dirname(p), { recursive: true });

		const destination = createWriteStream(p);

		const signer = crypto.createHash("md5");

		req.on("end", async () => {
			const md5 = signer.digest("base64");

			if (token.md5 !== md5) {
				await rm(p);
				res.sendStatus(400);
			}

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
