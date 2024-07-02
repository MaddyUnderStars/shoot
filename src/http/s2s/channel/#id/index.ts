import type { APCollection, APCollectionPage } from "activitypub-types";
import { Router } from "express";
import { z } from "zod";
import { DMChannel, Message } from "../../../../entity";
import { Channel } from "../../../../entity/channel";
import { getExternalPathFromActor } from "../../../../sender";
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
	buildAPPerson,
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

router.get(
	"/outbox",
	route(
		{
			params: z.object({
				channel_id: z.string(),
			}),
			query: z.object({
				page: z.boolean({ coerce: true }).default(false).optional(),
				min_id: z.string().optional(),
				max_id: z.string().optional(),
			}),
		},
		async (req, res) => {
			const { channel_id } = req.params;

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

router.get(
	"/followers",
	route(
		{
			params: z.object({
				channel_id: z.string(),
			}),
			query: z.object({
				page: z.string().optional(),
			}),
		},
		async (req, res) => {
			const { channel_id } = req.params;
			const { page } = req.query;

			const channel = await DMChannel.findOneOrFail({
				where: { id: channel_id },
				relations: { recipients: true, owner: true },
			});

			const colId = `${config.federation.instance_url.origin}${getExternalPathFromActor(channel)}/followers`;

			if (!page)
				return res.json(
					addContext(
						buildCollection(colId, channel.recipients.length + 1), // add owner
					),
				);

			const nextPage = undefined;
			//channel.recipients[channel.recipients.length - 1].id;

			const collection = buildCollectionPage(colId, page, nextPage);

			collection.items = channel.recipients
				// biome-ignore lint/style/noNonNullAssertion: <explanation>
				.map((x) => x.remote_address ?? buildAPPerson(x).id!)
				.concat(
					channel.owner.remote_address ??
						// biome-ignore lint/style/noNonNullAssertion: <explanation>
						buildAPPerson(channel.owner).id!,
				);

			return res.json(addContext(collection));
		},
	),
);

const buildCollectionPage = (
	id: string,
	currentPage: string,
	nextPage?: string,
	ordered = false,
): APCollectionPage => {
	return {
		id: setUrlParam(id, "page", currentPage),
		type: ordered ? "OrderedCollectionPage" : "CollectionPage",
		partOf: id,
		next: nextPage ? setUrlParam(id, "page", nextPage) : undefined,
	};
};

const buildCollection = (
	id: string,
	totalItems: number,
	ordered = false,
): APCollection => {
	return {
		id,
		totalItems,
		type: ordered ? "OrderedCollection" : "Collection",
		first: setUrlParam(id, "page", "true"),
	};
};

const setUrlParam = (url: string, param: string, value: string) => {
	const ret = new URL(url);
	ret.searchParams.set(param, value);
	return ret.toString();
};

export default router;
