import { Router } from "express";
import { z } from "zod";
import { Message, PublicMessage } from "../../../../../entity";
import { PERMISSION, handleMessage, route } from "../../../../../util";
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

const MessageFetchOpts = z.object({
	channel_id: z.string(),
	limit: z.number({ coerce: true }).max(50).min(1).default(50),
	after: z.string().optional(),
	before: z.string().optional(),
	around: z.string().optional(),
});

// Get messages of a channel
router.get(
	"/",
	route(
		{
			params: MessageFetchOpts,
			response: z.array(PublicMessage),
		},
		async (req, res) => {
			const channel = await getOrFetchChannel(req.params.channel_id);

			channel.throwPermission(req.user, PERMISSION.VIEW_CHANNEL);

			// TODO: handle not fetched federated channels

			// TODO: handle after, before, around
			const messages = await Message.find({
				where: { channel: { id: channel.id } },
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
