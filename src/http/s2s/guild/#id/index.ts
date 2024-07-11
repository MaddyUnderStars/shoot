import type { AnyAPObject } from "activitypub-types";
import { Router } from "express";
import { z } from "zod";
import { Guild, GuildTextChannel, Role } from "../../../../entity";
import {
	addContext,
	buildAPGroup,
	buildAPOrganization,
	buildAPRole,
	config,
	makeOrderedCollection,
	route,
} from "../../../../util";
import { handleInbox } from "../../../../util/activitypub/inbox";

const router = Router({ mergeParams: true });

router.get(
	"/",
	route({ params: z.object({ guild_id: z.string() }) }, async (req, res) => {
		const { guild_id } = req.params;

		const guild = await Guild.findOneOrFail({
			where: {
				id: guild_id,
				domain: config.federation.webapp_url.hostname,
			},
			relations: {
				owner: true,
			},
		});

		return res.json(addContext(buildAPOrganization(guild)));
	}),
);

router.post(
	"/inbox",
	route(
		{
			params: z.object({ guild_id: z.string() }),
			body: z.any(),
		},
		async (req, res) => {
			const guild = await Guild.findOneOrFail({
				where: {
					id: req.params.guild_id,
					domain: config.federation.webapp_url.hostname,
				},
			});

			await handleInbox(req.body, guild);

			return res.sendStatus(200);
		},
	),
);

router.get(
	"/:collection",
	route(
		{
			params: z.object({
				guild_id: z.string(),
				collection: z.union([
					z.literal("followers"),
					z.literal("following"),
					z.literal("outbox"),
				]),
			}),
			query: z.object({
				page: z.boolean({ coerce: true }).default(false).optional(),
				min_id: z.string().optional(),
				max_id: z.string().optional(),
			}),
		},
		async (req, res) => {
			const { guild_id, collection } = req.params;

			// const user = await User.findOneOrFail({
			// 	where: { name: user_id },
			// });

			return res.json(
				addContext(
					await makeOrderedCollection<AnyAPObject>({
						id: `${config.federation.instance_url.origin}${req.originalUrl}`,
						page: req.query.page ?? false,
						min_id: req.query.min_id,
						max_id: req.query.max_id,
						getElements: async () => {
							switch (collection) {
								case "outbox":
								// audit log?
								case "followers":
									// roles
									return (
										await Role.find({
											where: {
												guild: { id: guild_id },
											},
											relations: { guild: true },
										})
									).map((x) => buildAPRole(x));
								case "following":
									// channels
									return (
										await GuildTextChannel.find({
											where: {
												guild: { id: guild_id },
											},
											relations: { guild: true },
										})
									).map((x) => buildAPGroup(x));
							}
						},
						getTotalElements: async () => {
							switch (collection) {
								case "outbox":
								case "followers":
									return await Role.count({
										where: { guild: { id: guild_id } },
									});
								case "following":
									return await GuildTextChannel.count({
										where: {
											guild: { id: guild_id },
										},
									});
							}
						},
					}),
				),
			);
		},
	),
);

export default router;
