import { Router } from "express";
import { z } from "zod";
import { getOrFetchUser, route } from "../../../../util";
import { createDmChannel } from "../../../../util/entity/channel";

const router = Router({ mergeParams: true });

const DMChannelCreate = z.object({
	name: z.string(),
});

// Creates a DM channel or returns an existing one between yourself and :user_id
router.post(
	"/",
	route(
		{
			body: DMChannelCreate,
			params: z.object({
				user_id: z.string(),
			}),
		},
		async (req, res) => {
			const { user_id } = req.params;

			const owner = req.user;
			const recipient = await getOrFetchUser(user_id);

			// TODO: find existing dm channel

			const channel = await createDmChannel(req.body.name, owner, [
				recipient,
			]);

			// TODO: federate channel creation
			// Probably create it locally and then send a Follow to recipient
			// Once we receive an Accept, they'll be properly added to the dm

			return res.json(channel.toPublic());
		},
	),
);

export default router;
