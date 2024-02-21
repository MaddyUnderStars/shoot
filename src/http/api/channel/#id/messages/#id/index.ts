import { Router } from "express";
import { z } from "zod";
import { Message, PublicMessage } from "../../../../../../entity";
import { route, splitQualifiedMention } from "../../../../../../util";

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
			const channelMention = splitQualifiedMention(req.params.channel_id);

			// TODO: fetch remote messages

			const message = await Message.findOneOrFail({
				where: {
					id: req.params.message_id,
					channel: {
						id: channelMention.user,
						domain: channelMention.domain,
					},
				},
				loadRelationIds: true,
			});
			return res.json(message.toPublic());
		},
	),
);

export default router;
