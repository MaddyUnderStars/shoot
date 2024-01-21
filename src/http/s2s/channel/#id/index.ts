import { Router } from "express";
import { z } from "zod";
import { Message } from "../../../../entity";
import { Channel } from "../../../../entity/channel";
import {
	addContext,
	config,
	getDatabase,
	makeOrderedCollection,
	route,
} from "../../../../util";
import { handleInbox } from "../../../../util/activitypub/inbox";
import {
	buildAPGroup,
	buildAPNote,
} from "../../../../util/activitypub/transformers";

const router = Router({ mergeParams: true });

router.get(
	"/",
	route(
		{ params: z.object({ channel_id: z.string() }) },
		async (req, res) => {
			const { channel_id } = req.params;

			let channel = await getDatabase()
				.createQueryBuilder(Channel, "channels")
				.select("channels")
				.leftJoinAndSelect("channels.recipients", "recipients")
				.leftJoinAndSelect("channels.owner", "owner")
				.where("channels.id = :id", { id: channel_id })
				.andWhere("channels.domain = :domain", {
					domain: config.federation.webapp_url.hostname,
				})
				.getOneOrFail();

			return res.json(addContext(buildAPGroup(channel)));
		},
	),
);

router.post(
	"/inbox",
	route(
		{
			params: z.object({ channel_id: z.string() }),
			body: z.any(),
		},
		async (req, res) => {
			const channel = await getDatabase()
				.createQueryBuilder(Channel, "channels")
				.select("channels")
				.leftJoinAndSelect("channels.recipients", "recipients")
				.leftJoinAndSelect("channels.owner", "owner")
				.where("channels.id = :id", { id: req.params.channel_id })
				.andWhere("channels.domain = :domain", {
					domain: config.federation.webapp_url.hostname,
				})
				.getOneOrFail();

			await handleInbox(req.body, channel);
			return res.sendStatus(200);
		},
	),
);

router.get(
	"/:collection",
	route(
		{
			params: z.object({
				channel_id: z.string(),
				collection: z.literal("outbox"),
			}),
			query: z.object({
				page: z.boolean({ coerce: true }).default(false).optional(),
				min_id: z.string().optional(),
				max_id: z.string().optional(),
			}),
		},
		async (req, res) => {
			const { channel_id, collection } = req.params;

			return res.json(
				addContext(
					await makeOrderedCollection({
						id: `${config.federation.instance_url.origin}${req.originalUrl}`,
						page: req.query.page ?? false,
						min_id: req.query.min_id,
						max_id: req.query.max_id,
						getElements: async (before, after) => {
							return (
								await Message.find({
									where: { channel: { id: channel_id } },
									relations: {
										author: true,
										channel: true,
									},
								})
							).map((msg) => buildAPNote(msg));
						},
						getTotalElements: async () => {
							return await Message.count({
								where: { channel: { id: channel_id } },
							});
						},
					}),
				),
			);
		},
	),
);

export default router;
