import bcrypt from "bcrypt";
import { Router } from "express";
import z from "zod";

import { PublicUser, User } from "../../../entity/user";
import { config } from "../../../util/config";
import { HttpError } from "../../../util/httperror";
import { route } from "../../../util/route";
import { generateToken } from "../../../util/token";

const router = Router();

const LoginRequest = z.object({
	username: z.string(),
	password: z.string(),
});

const LoginResponse = z.object({
	token: z.string(),
	user: PublicUser,
});

const INVALID_LOGIN = "Invalid login";

router.post(
	"/login",
	route(
		{
			body: LoginRequest,
			response: LoginResponse,
		},
		async (req, res) => {
			const { username, password } = req.body;

			const user = await User.findOneOrFail({
				where: {
					name: username.toLowerCase(),
					domain: config().federation.webapp_url.hostname,
				},
			}).catch(() => {
				// Throw the same error, to prevent knowing accounts exists
				throw new HttpError(INVALID_LOGIN, 401);
			});

			if (!user.password_hash) throw new HttpError(INVALID_LOGIN, 401);

			if (!(await bcrypt.compare(password, user.password_hash)))
				throw new HttpError(INVALID_LOGIN, 401);

			return res.json({
				token: await generateToken(user.id),
				user: user.toPrivate(),
			});
		},
	),
);

export default router;
