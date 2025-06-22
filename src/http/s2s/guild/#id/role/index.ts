import { Router } from "express";
import { z } from "zod";
import { Member } from "../../../../../entity";
import { Role } from "../../../../../entity/role";
import {
	addContext,
	getDatabase,
	makeInstanceUrl,
	orderedCollectionHandler,
	route,
} from "../../../../../util";
import {
	buildAPActor,
	buildAPRole,
} from "../../../../../util/activitypub/transformers";

const router = Router({ mergeParams: true });

router.get(
	"/:role_id",
	route(
		{ params: z.object({ guild_id: z.string(), role_id: z.string() }) },
		async (req, res) => {
			// if (req.actor instanceof User)
			// 	await isMemberOfGuildThrow(req.params.guild_id, req.actor);
			// else throw new APError("Missing permission", 400);
			const role = await Role.findOneOrFail({
				where: {
					guild: { id: req.params.guild_id },
					id: req.params.role_id,
				},
				relations: { guild: true },
			});

			return res.json(addContext(buildAPRole(role)));
		},
	),
);

router.get(
	"/:role_id/members",
	route(
		{
			query: z.object({
				before: z.string().optional(),
				after: z.string().optional(),
			}),
			params: z.object({
				role_id: z.string(),
				guild_id: z.string(),
			}),
		},
		async (req, res) =>
			res.json(
				await orderedCollectionHandler({
					id: makeInstanceUrl(
						`/guild/${req.params.guild_id}/role/${req.params.role_id}`,
					),
					before: req.query.before,
					after: req.query.after,
					convert: (x) =>
						x.user.remote_address ?? buildAPActor(x.user),
					entity: Member,
					qb: getDatabase()
						.getRepository(Member)
						.createQueryBuilder("member")
						.leftJoin(
							"member.roles",
							"role",
							"role.id = :role_id",
							{ role_id: req.params.role_id },
						)
						.leftJoinAndSelect("member.user", "user"),
				}),
			),
	),
);

// router.get(
// 	"/:role_id/members",
// 	route(
// 		{
// 			params: z.object({ guild_id: z.string(), role_id: z.string() }),
// 			query: z.object({
// 				page: z.boolean({ coerce: true }).default(false).optional(),
// 				min_id: z.string().optional(),
// 				max_id: z.string().optional(),
// 			}),
// 		},
// 		async (req, res) => {
// 			return res.json(
// 				addContext(
// 					await makeOrderedCollection<APPerson>({
// 						id: `${config.federation.instance_url.origin}${req.originalUrl}`,
// 						page: req.query.page ?? false,
// 						min_id: req.query.min_id,
// 						max_id: req.query.max_id,
// 						getElements: async () => {
// 							return (
// 								await Member.find({
// 									where: {
// 										roles: {
// 											id: req.params.role_id,
// 											guild: { id: req.params.guild_id },
// 										},
// 									},
// 								})
// 							).map((x) => buildAPPerson(x.user));
// 						},
// 						getTotalElements: async () => {
// 							return await Member.count({
// 								where: {
// 									roles: {
// 										id: req.params.role_id,
// 										guild: { id: req.params.guild_id },
// 									},
// 								},
// 							});
// 						},
// 					}),
// 				),
// 			);
// 		},
// 	),
// );

export default router;
