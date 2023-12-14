import bcrypt from "bcrypt";
import { Response, Router } from "express";
import z from "zod";

import { PublicUser, User } from "../../../entity";
import { HttpError, config, generateToken, route } from "../../../util";

const router = Router();

const LoginRequest = z.object({
	username: z.string(),
	password: z.string(),
});

const INVALID_LOGIN = "Invalid login";

router.post(
	"/login",
	route({ body: LoginRequest }, async (req, res: Response<LoginResponse>) => {
		const { username, password } = req.body;

		const user = await User.findOneOrFail({
			where: { username, domain: config.federation.webapp_url.hostname },
		}).catch(() => {
			// Throw the same error, to prevent knowing accounts exists
			throw new HttpError(INVALID_LOGIN, 401);
		});

		if (!(await bcrypt.compare(password, user.password_hash!)))
			throw new HttpError(INVALID_LOGIN, 401);

		return res.json({
			token: await generateToken(user.id),
			user: user.toPrivate(),
		});
	}),
);

export default router;

// TODO: captcha response

interface LoginResponse {
	token: string;
	user: PublicUser;
}
