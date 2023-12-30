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

const UserModifySchema: z.ZodSchema<Partial<User>> = z.object({
	name: z.string(),
    display_name: z.string(),
	summary: z.string(),
	// todo: profile picture
}).partial();

router.patch(
	"/",
	route(
		{
			body: UserModifySchema,
		},
		async (req, res) => {
            req.user.assign(req.body);
            await req.user.save();
            return res.json(req.user.toPrivate());
        },
	),
);

export default router;
