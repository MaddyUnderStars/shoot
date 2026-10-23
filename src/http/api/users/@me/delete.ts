import { Router } from "express";
import { route } from "../../../../util/route.js";
import bcrypt from "bcrypt";
import z from "zod";
import { HttpError } from "../../../../util/httperror.js";
import { User } from "../../../../entity/user.js";

const router = Router({ mergeParams: true });

const INVALID_LOGIN = "Invalid login";

/**
 * Delete your own user.
 * This has to be a POST rather than DELETE because
 * some clients cannot send DELETE with body, and some hosting infrastructure rejects it
 */
router.post(
	"/",
	route(
		{
			body: z.object({
				password: z.string(),
			}),
		},
		async (req, res) => {
			const user = req.user;

			if (!user || !user.password_hash) throw new HttpError(INVALID_LOGIN, 401);

			if (!(await bcrypt.compare(req.body.password, user.password_hash)))
				throw new HttpError(INVALID_LOGIN, 401);

			await User.delete({ id: user.id });

			res.sendStatus(202);
		},
	),
);

export default router;
