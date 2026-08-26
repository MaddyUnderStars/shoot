import { Router } from "express";
import { route } from "../../../util/route.js";
import z from "zod";
import { OauthClient } from "../../../entity/oauthClient.js";
import crypto from "node:crypto";
import { promisify } from "node:util";
const randomBytes = promisify(crypto.randomBytes);

const router = Router();

router.post(
	"/",
	route(
		{
			body: z
				.looseObject({
					redirect_uris: z.string().array(),
					grant_types: z
						.union(
							[
								z.literal("authorization_code"),
								z.literal("client_credentials"),
								z.literal("refresh_token"),
							],
							{
								error: "Unsupported grant type",
							},
						)
						.array(),
					client_name: z.string(),
					scope: z.string(),
				})
				.partial(),
		},
		async (req, res) => {
			const client = await OauthClient.create({
				redirectUris: req.body.redirect_uris ?? [],
				grants: req.body.grant_types ?? [],
				name: req.body.client_name ?? null,
				secret: (await randomBytes(32)).toString("hex"),
			}).save();

			return res.status(201).json({
				client_id: client.id,
				client_secret: client.secret,
				client_id_issued_at: Date.now(),
				client_secret_expires_at: 0,

				redirect_uris: client.redirectUris,
				grant_types: client.grants,
				client_name: client.name,
			});
		},
	),
);

export default router;
