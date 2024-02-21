import { Router } from "express";
import { z } from "zod";
import { Message, PublicMessage } from "../../../../../entity";
import {
	handleMessage,
	route,
	splitQualifiedMention,
} from "../../../../../util";
import { getOrFetchChannel } from "../../../../../util/entity/channel";

const MessageCreate = z.object({
	content: z.string(),
});

const router = Router({ mergeParams: true });

// Create a message in a channel
router.post(
	"/",
	route(
		{
			body: MessageCreate,
			params: z.object({ channel_id: z.string() }),
			response: PublicMessage,
		},
		async (req, res) => {
			const { channel_id } = req.params;

			const channel = await getOrFetchChannel(channel_id);

			const message = Message.create({
				channel,

				content: req.body.content,
				author: req.user,
			});

			await handleMessage(message);

			return res.json(message.toPublic());
		},
	),
);

// Get messages of a channel
router.get(
	"/",
	route(
		{
			params: z.object({
				channel_id: z.string(),
				limit: z.number({ coerce: true }).max(50).min(1).default(50),

				// TODO: only allow a single of the following:
				after: z.string().optional(),
				before: z.string().optional(),
				around: z.string().optional(),
			}),
		},
		async (req, res) => {
			const channelMention = splitQualifiedMention(req.params.channel_id);

			// TODO: handle not fetched federated channels

			// TODO: handle after, before, around
			const messages = await Message.find({
				where: [
					{
						channel: {
							id: channelMention.user,
							domain: channelMention.domain,
						},
					},
					{
						channel: {
							remote_id: channelMention.user,
							domain: channelMention.domain,
						},
					},
				],
				take: req.params.limit,
				order: {
					published: "DESC",
				},
				loadRelationIds: true,
			});

			return res.json(messages.map((x) => x.toPublic()));
		},
	),
);

export default router;
