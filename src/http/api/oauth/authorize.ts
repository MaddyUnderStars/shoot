import { Router } from "express";
import { route } from "../../../util/route.js";
import z from "zod";
import { HttpError } from "../../../util/httperror.js";
import { User } from "../../../entity/user.js";
import { config } from "../../../util/config.js";
import bcrypt from "bcrypt";
import { Oauth } from "../../../util/oauth.js";
import { Request } from "express";
import { OauthClient } from "../../../entity/oauthClient.js";

const router = Router();

const AuthorizeRequest = z.object({
	client_id: z.uuid(),
	redirect_uri: z.string().optional(),
	response_type: z.string(),
	scope: z.string().optional(), // ignored
	state: z.string().optional(),
	code_challenge: z.string(),
	code_challenge_method: z.literal("S256").optional().default("S256"),
});

const INVALID_LOGIN = "Invalid login";

router.get(
	"/",
	route(
		{
			query: AuthorizeRequest,
		},
		async (req, res) => {
			const client = await OauthClient.findOneOrFail({ where: { id: req.query.client_id } });

			res.render("authorize", {
				title: "Authorise",
				server: { name: config().general.name ?? config().federation.webapp_url.hostname },

				client: { id: req.query.client_id, name: client.name },
				redirectUri: req.query.redirect_uri,
				responseType: req.query.response_type,
				state: req.query.state,
				code_challenge: req.query.code_challenge,
				code_challenge_method: req.query.code_challenge_method,
			});
		},
	),
);

router.post(
	"/",
	route(
		{
			body: AuthorizeRequest.and(
				z.object({
					username: z.string(),
					password: z.string(),
				}),
			),
		},
		async (req, res, next) => {
			const user = await User.findOne({
				where: {
					name: req.body.username,
					domain: config().federation.webapp_url.hostname,
				},
			});

			if (!user || !user.password_hash) throw new HttpError(INVALID_LOGIN, 401);

			if (!(await bcrypt.compare(req.body.password, user.password_hash)))
				throw new HttpError(INVALID_LOGIN, 401);

			req.user = user;
			next();
		},
	),
	Oauth.authorize({
		authenticateHandler: {
			handle: function (req: Request) {
				return req.user;
			},
		},
	}),
);

export default router;
