import { Router } from "express";
import { z } from "zod";
import { Invite } from "../../../entity";
import { route } from "../../../util";
import { joinGuild } from "../../../util/entity/guild";

const router = Router({ mergeParams: true });

// TODO: fetch federated invites

router.post(
	"/",
	route(
		{
			body: z.object({ code: z.string() }),
		},
		async (req, res) => {
			// accept an invite code

			const invite = await Invite.findOneOrFail({
				where: {
					code: req.body.code,
				},
				loadRelationIds: {
					relations: ["guild"],
					disableMixedMap: true,
				},
			});

			await joinGuild(req.user.id, invite.guild.id);

			return res.sendStatus(200);
		},
	),
);

router.delete(
	"/",
	route(
		{
			params: z.object({ code: z.string() }),
		},
		async (req, res) => {
			const { code } = req.params;

			await Invite.delete({
				code,
			});

			return res.sendStatus(200);
		},
	),
);

export default router;
