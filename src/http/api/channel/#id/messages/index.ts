import { Router } from "express";
import { z } from "zod";
import { Message, PublicMessage } from "../../../../../entity";
import {
	PERMISSION,
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

			channel.throwPermission(req.user, PERMISSION.VIEW_CHANNEL);

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
			params: z
				.object({
					channel_id: z.string(),
					limit: z
						.number({ coerce: true })
						.max(50)
						.min(1)
						.default(50),
				})
				.and(
					z
						.object({ after: z.string().optional() })
						.or(z.object({ before: z.string().optional() }))
						.or(z.object({ around: z.string().optional() })),
				),
			response: z.array(PublicMessage),
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
				relations: {
					author: true,
					channel: true,
				},
			});

			return res.json(messages.map((x) => x.toPublic()));
		},
	),
);

export default router;
