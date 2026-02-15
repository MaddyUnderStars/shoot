import { Router } from "express";
import { z } from "zod";
import { Attachment } from "../../../../../entity/attachment";
import { Message, PublicMessage } from "../../../../../entity/message";
import { ActorMention } from "../../../../../util/activitypub/constants";
import { getDatabase } from "../../../../../util/database";
import { getOrFetchChannel } from "../../../../../util/entity/channel";
import { handleMessage } from "../../../../../util/entity/message";
import { PERMISSION } from "../../../../../util/permission";
import { route } from "../../../../../util/route";

const MessageCreate = z
	.object({
		content: z.string(),
		files: z.array(
			z.object({
				name: z.string(),
				hash: z.string(),
			}),
		),
		nonce: z.uuid(),
	})
	.partial()
	.refine(
		(obj) => obj.files?.length || obj.content?.length,
		"Message must not be empty",
	)
	.openapi("MessageCreateRequest", {
		anyOf: [{ required: ["content"] }, { required: ["files"] }],
	});

const router = Router({ mergeParams: true });

// Create a message in a channel
router.post(
	"/",
	route(
		{
			body: MessageCreate,
			params: z.object({ channel_id: ActorMention }),
			response: PublicMessage,
		},
		async (req, res) => {
			const { channel_id } = req.params;

			const channel = await getOrFetchChannel(channel_id);

			await channel.throwPermission(req.user, [
				PERMISSION.VIEW_CHANNEL,
				PERMISSION.SEND_MESSAGES,
			]);

			if (req.body.files?.length)
				await channel.throwPermission(req.user, PERMISSION.UPLOAD);

			// check if this message was already received (via nonce)
			const existing = req.body.nonce
				? await Message.findOne({
						where: { nonce: req.body.nonce },
						relations: {
							channel: true,
							author: true,
							files: true,
							embeds: true,
						},
					})
				: null;

			if (existing) {
				return res.json(existing.toPublic());
			}

			const message = Message.create({
				channel,

				// validation is done in handleMessage
				files: req.body.files?.length
					? req.body.files?.map((x) =>
							Attachment.create({
								name: x.name,
								hash: x.hash,
							}),
						)
					: [],

				content: req.body.content,
				author: req.user,

				nonce: req.body.nonce,
			});

			await handleMessage(message);

			return res.json(message.toPublic());
		},
	),
);

const MessageFetchOpts = z.object({
	limit: z.coerce.number().max(50).min(1).optional().default(50),
	order: z.literal("ASC").or(z.literal("DESC")).optional().default("DESC"),
	after: z.string().optional(),
	before: z.string().optional(),
	around: z.string().optional(),
	query: z.string().optional(),
});

// Get messages of a channel
router.get(
	"/",
	route(
		{
			params: z.object({
				channel_id: ActorMention,
			}),
			query: MessageFetchOpts,
			response: z.array(PublicMessage),
		},
		async (req, res) => {
			const channel = await getOrFetchChannel(req.params.channel_id);

			await channel.throwPermission(req.user, PERMISSION.VIEW_CHANNEL);

			const query = getDatabase()
				.getRepository(Message)
				.createQueryBuilder("messages")
				.limit(req.query.limit)
				.orderBy("messages.id", req.query.order)
				.leftJoinAndSelect("messages.author", "author")
				.leftJoinAndSelect("messages.files", "files")
				.leftJoinAndSelect("messages.embeds", "embeds")
				.where("messages.channelId = :channel_id", {
					channel_id: channel.id,
				});

			if (req.query.query)
				query.andWhere(
					"to_tsvector(messages.content) @@ to_tsquery(:query)",
					{
						query: req.query.query,
					},
				);

			if (req.query.after)
				query.andWhere("messages.id > :after", {
					after: req.query.after,
				});
			else if (req.query.before)
				query.andWhere("messages.id < :before", {
					before: req.query.before,
				});
			// else if (req.query.around) { TODO
			// 	query.andWhere(
			// 		new Brackets((qb) => {
			// 			qb.where("messages.id > :after", {
			// 				after: req.query.after,
			// 			});
			// 		}),
			// 	);
			// }

			const messages = await query.getMany();

			// // TODO: handle not fetched federated channels

			// // TODO: handle after, before, around
			// // Maybe use typeorm-pagination?
			// const messages = await Message.find({
			// 	where: { channel: { id: channel.id } },
			// 	take: req.params.limit,
			// 	order: {
			// 		published: "DESC",
			// 	},
			// 	relations: {
			// 		author: true,
			// 		channel: true,
			// 	},
			// });

			return res.json(
				messages.map((x) => {
					x.channel = channel;
					return x.toPublic();
				}),
			);
		},
	),
);

export default router;
