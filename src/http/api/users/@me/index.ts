import bcrypt from "bcrypt";
import { Router } from "express";
import { z } from "zod";
import { PrivateUser, User } from "../../../../entity/user.js";
import { HttpError } from "../../../../util/httperror.js";
import { route } from "../../../../util/route.js";
import { checkFileExists } from "../../../../util/storage/index.js";

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
		display_name: z.string().nullish(),
		summary: z.string().nullish(),

		avatar: z.string().nullish(),
		banner: z.string().nullish(),

		current_password: z.string().nullish(),

		// the below fields require current_password
		password: z.string().nullish(),
		email: z.email().nullish(),
	})
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
			errors: {
				204: z.literal("Accepted"),
			},
		},
		async (req, res) => {
			if (req.body.current_password) {
				if (
					!req.user.password_hash ||
					!(await bcrypt.compare(req.body.current_password, req.user.password_hash))
				)
					throw new HttpError("Invalid login", 401);
			}

			const update: Partial<User> = {};

			if (req.body.display_name !== undefined)
				update.display_name = req.body.display_name || req.user.name;
			if (req.body.summary !== undefined) update.summary = req.body.summary || null;

			// current_password is required to set email
			if (req.body.email !== undefined) update.email = req.body.email;

			if (req.body.password) {
				// zod schema enforces that current_password is provided

				update.password_hash = await bcrypt.hash(req.body.password, 12);

				// TODO: we might want to invalidate all this users sessions
				// and give them a new token
			}

			if (req.body.avatar) {
				const head = await checkFileExists(req.user, req.body.avatar);

				if (!head) throw new HttpError("File does not exist", 400);

				update.avatar = req.body.avatar;
			} else if (req.body.avatar === null) update.avatar = null;

			if (req.body.banner) {
				const head = await checkFileExists(req.user, req.body.banner);

				if (!head) throw new HttpError("File does not exist", 400);

				update.banner = req.body.banner;
			} else if (req.body.banner === null) update.banner = null;

			if (Object.keys(update).length === 0) {
				throw new HttpError("Must specify at least one property", 401);
			}

			await User.update({ id: req.user.id }, update);
			return res.sendStatus(204);
		},
	),
);

export default router;
