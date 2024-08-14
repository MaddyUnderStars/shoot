import { type APFollow, ObjectIsOrganization } from "activitypub-types";
import { Router } from "express";
import { z } from "zod";
import { Invite } from "../../../entity";
import { getExternalPathFromActor, sendActivity } from "../../../sender";
import {
	APError,
	addContext,
	config,
	resolveWebfinger,
	route,
	splitQualifiedMention,
} from "../../../util";
import { getOrFetchGuild, joinGuild } from "../../../util/entity/guild";

const router = Router({ mergeParams: true });

router.post(
	"/:invite_code",
	route(
		{
			params: z.object({ invite_code: z.string() }),
		},
		async (req, res) => {
			// accept an invite code

			const mention = splitQualifiedMention(req.params.invite_code);

			const invite = await Invite.findOne({
				where: {
					code: mention.user,
				},
				loadRelationIds: {
					relations: ["guild"],
					disableMixedMap: true,
				},
			});

			if (!invite) {
				const obj = await resolveWebfinger(
					`invite:${req.params.invite_code}`,
				);
				if (obj.type !== "GuildInvite")
					throw new APError(
						"Remote did not respond with GuildInvite",
					);

				const { attributedTo } = obj;
				if (
					!attributedTo ||
					Array.isArray(attributedTo) ||
					typeof attributedTo === "string" ||
					!ObjectIsOrganization(attributedTo)
				) {
					return;
				}

				const guild = await getOrFetchGuild(attributedTo);

				await sendActivity(
					guild,
					addContext({
						id: `${config.federation.instance_url.origin}${getExternalPathFromActor(req.user)}/invite/${req.params.invite_code}`,
						type: "Follow",
						actor: `${config.federation.instance_url.origin}${getExternalPathFromActor(req.user)}`,
						object: guild.remote_address,
						instrument: req.params.invite_code,
					} as APFollow),
					req.user,
				);

				return res.sendStatus(202);
			}

			await joinGuild(req.user.id, invite.guild.id);

			return res.sendStatus(204);
		},
	),
);

// TODO: federated deletes

router.delete(
	"/:invite_code",
	route(
		{
			params: z.object({ invite_code: z.string() }),
		},
		async (req, res) => {
			const { invite_code } = req.params;

			await Invite.delete({
				code: invite_code,
			});

			return res.sendStatus(200);
		},
	),
);

export default router;
