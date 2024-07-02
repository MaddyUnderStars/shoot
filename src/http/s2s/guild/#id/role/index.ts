import type { APPerson } from "activitypub-types";
import { Router } from "express";
import { z } from "zod";
import { Member } from "../../../../../entity";
import { Role } from "../../../../../entity/role";
import {
	addContext,
	buildAPPerson,
	buildAPRole,
	config,
	makeOrderedCollection,
	route,
} from "../../../../../util";

const router = Router({ mergeParams: true });

router.get(
	"/:role_id",
	route(
		{ params: z.object({ guild_id: z.string(), role_id: z.string() }) },
		async (req, res) => {
			const role = await Role.findOneOrFail({
				where: {
					guild: { id: req.params.guild_id },
					id: req.params.role_id,
				},
			});

			return res.json(addContext(buildAPRole(role)));
		},
	),
);

router.get(
	"/:role_id/members",
	route(
		{
			params: z.object({ guild_id: z.string(), role_id: z.string() }),
			query: z.object({
				page: z.boolean({ coerce: true }).default(false).optional(),
				min_id: z.string().optional(),
				max_id: z.string().optional(),
			}),
		},
		async (req, res) => {
			return res.json(
				addContext(
					await makeOrderedCollection<APPerson>({
						id: `${config.federation.instance_url.origin}${req.originalUrl}`,
						page: req.query.page ?? false,
						min_id: req.query.min_id,
						max_id: req.query.max_id,
						getElements: async () => {
							return (
								await Member.find({
									where: {
										roles: {
											id: req.params.role_id,
											guild: { id: req.params.guild_id },
										},
									},
								})
							).map((x) => buildAPPerson(x.user));
						},
						getTotalElements: async () => {
							return await Member.count({
								where: {
									roles: {
										id: req.params.role_id,
										guild: { id: req.params.guild_id },
									},
								},
							});
						},
					}),
				),
			);
		},
	),
);

export default router;
