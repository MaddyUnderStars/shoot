import bcrypt from "bcrypt";
import { Router } from "express";
import { z } from "zod";
import { PrivateUser, User } from "../../../../entity/user";
import { HttpError } from "../../../../util/httperror";
import { route } from "../../../../util/route";

const router = Router({ mergeParams: true });

router.get(
	"/",
	route(
		{
			response: PrivateUser,
		},
		async (req, res) => {
			return res.json(req.user.toPrivate());
		},
	),
);

const UserModifySchema = z
	.object({
		display_name: z.string(),
		summary: z.string(),
		// todo: profile picture

		current_password: z.string(),

		// the below fields require current_password
		password: z.string(),
		email: z.string().email(),
	})
	.partial()
	.strict()
	.refine((obj) => {
		if (obj.password !== undefined || obj.email !== undefined) {
			return obj.current_password !== undefined;
		}

		return true;
	}, "Must provide current password");

router.patch(
	"/",
	route(
		{
			body: UserModifySchema,
		},
		async (req, res) => {
			if (req.body.current_password) {
				if (
					!req.user.password_hash ||
					!(await bcrypt.compare(
						req.body.current_password,
						req.user.password_hash,
					))
				)
					throw new HttpError("Invalid login", 401);
			}

			const update: Partial<User> = {};

			// I'm sure there's a better way to do this...
			if (req.body.display_name)
				update.display_name = req.body.display_name;
			if (req.body.summary) update.summary = req.body.summary;

			// current_password is required to set email
			if (req.body.email) update.email = req.body.email;

			if (req.body.password) {
				// zod schema enforces that current_password is provided

				update.password_hash = await bcrypt.hash(req.body.password, 12);

				// TODO: we might want to invalidate all this users sessions
				// and give them a new token
			}

			if (Object.keys(update).length === 0) {
				throw new HttpError("Must specify at least one property", 401);
			}

			await User.update({ id: req.user.id }, update);
			return res.sendStatus(200);
		},
	),
);

export default router;
