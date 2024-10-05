import { Router } from "express";
import { z } from "zod";
import { Message, PublicMessage } from "../../../../../../entity";
import { PERMISSION, getOrFetchChannel, route } from "../../../../../../util";

const router = Router({ mergeParams: true });

router.get(
	"/",
	route(
		{
			params: z.object({
				channel_id: z.string(),
				message_id: z.string(),
			}),
			response: PublicMessage,
		},
		async (req, res) => {
			const channel = await getOrFetchChannel(req.params.channel_id);

			await channel.throwPermission(req.user, [PERMISSION.VIEW_CHANNEL]);

			// TODO: fetch remote messages

			const message = await Message.findOneOrFail({
				where: {
					channel: { id: channel.id },
					id: req.params.message_id,
				},
				loadRelationIds: {
					relations: ["channel", "author"],
					disableMixedMap: true,
				},
			});

			return res.json(message.toPublic());
		},
	),
);

export default router;
