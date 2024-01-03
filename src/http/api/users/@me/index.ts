import { Router } from "express";
import { z } from "zod";
import { User } from "../../../../entity";
import { route } from "../../../../util";

const router = Router({ mergeParams: true });

router.get(
	"/",
	route({}, async (req, res) => {
		return res.json(req.user.toPrivate());
	}),
);

const UserModifySchema: z.ZodSchema<Partial<User>> = z
	.object({
		display_name: z.string(),
		summary: z.string(),
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
