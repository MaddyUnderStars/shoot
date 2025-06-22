import { Router } from "express";
import { z } from "zod";
import { PrivateUser, User } from "../../../../entity/user";
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

const UserModifySchema: z.ZodSchema<Partial<User>> = z
	.object({
		display_name: z.string(),
		summary: z.string(),
		email: z.string().email(),
		// todo: profile picture
	})
	.partial()
	.strict();

router.patch(
	"/",
	route(
		{
			body: UserModifySchema,
		},
		async (req, res) => {
			await User.update({ id: req.user.id }, req.body);
			return res.sendStatus(200);
		},
	),
);

export default router;
