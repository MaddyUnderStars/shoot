import { Router } from "express";
import { z } from "zod";
import { Message, User } from "../../../../entity";
import { Channel } from "../../../../entity/channel";
import {
	addContext,
	config,
	getDatabase,
	orderedCollectionHandler,
	route,
} from "../../../../util";
import { handleInbox } from "../../../../util/activitypub/inbox";
import {
	buildAPActor,
	buildAPNote,
} from "../../../../util/activitypub/transformers";

const router = Router({ mergeParams: true });

router.get(
	"/",
	route(
		{ params: z.object({ channel_id: z.string() }) },
		async (req, res) => {
			const { channel_id } = req.params;

			const channel = await getDatabase()
				.createQueryBuilder(Channel, "channels")
				.select("channels")
				.leftJoinAndSelect("channels.recipients", "recipients")
				.leftJoinAndSelect("channels.owner", "owner")
				.leftJoinAndSelect("channels.guild", "guild")
				.where("channels.id = :id", { id: channel_id })
				.andWhere("channels.domain = :domain", {
					domain: config.federation.webapp_url.hostname,
				})
				.getOneOrFail();

			return res.json(addContext(buildAPActor(channel)));
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
				.leftJoinAndSelect("channels.guild", "guild")
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

const COLLECTION_PARAMS = {
	params: z.object({
		channel_id: z.string(),
	}),
	query: z.object({
		before: z.string().optional(),
		after: z.string().optional(),
	}),
};

router.get(
	"/outbox",
	route(COLLECTION_PARAMS, async (req, res) =>
		res.json(
			await orderedCollectionHandler({
				id: new URL(
					`${config.federation.instance_url.origin}/channel/${req.params.channel_id}/outbox`,
				),
				keys: ["published"],
				before: req.query.before,
				after: req.query.after,
				convert: buildAPNote,
				entity: Message,
				qb: getDatabase()
					.getRepository(Message)
					.createQueryBuilder("message")
					.where("message.channelId = :channel_id", {
						channel_id: req.params.channel_id,
					})
					.leftJoinAndSelect("message.channel", "channel")
					.leftJoinAndSelect("message.author", "author"),
			}),
		),
	),
);

/**
 * Gets the recipients of a DM CHANNEL only.
 * For guild members, use the guild followers
 *
 * TODO: also needs to get the owner
 * Alternatively, could just add the owner as a recipient as well.
 */
router.get(
	"/followers",
	route(COLLECTION_PARAMS, async (req, res) =>
		res.json(
			await orderedCollectionHandler({
				id: new URL(
					`${config.federation.instance_url.origin}/channel/${req.params.channel_id}/followers`,
				),
				before: req.query.before,
				after: req.query.after,
				convert: buildAPActor,
				entity: User,
				qb: getDatabase()
					.getRepository(User)
					.createQueryBuilder("user")
					.leftJoin(
						"channels_recipients_users",
						"recipients",
						"recipients.usersId = user.id",
					)
					.where("recipients.channelsId = :channel_id", {
						channel_id: req.params.channel_id,
					}),
			}),
		),
	),
);

export default router;
