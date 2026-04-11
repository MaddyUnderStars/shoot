import bcrypt from "bcrypt";
import { Router } from "express";
import z from "zod";

import { User } from "../../../entity/user";
import { config } from "../../../util/config";
import { HttpError } from "../../../util/httperror";
import { route } from "../../../util/route";
import { getOidcProvider } from "../../oidc";

const router = Router({ mergeParams: true });

const LoginRequest = z.object({
	username: z.string(),
	password: z.string(),
});

const INVALID_LOGIN = "Invalid login";

router.post(
	"/login",
	route({ body: LoginRequest }, async (req, res) => {
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

		await getOidcProvider().interactionFinished(
			req,
			res,
			{ login: { accountId: user.id } },
			{ mergeWithLastSubmission: false },
		);
	}),
);

export default router;
