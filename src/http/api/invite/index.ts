import { type APFollow, ObjectIsOrganization } from "activitypub-types";
import { Router } from "express";
import { z } from "zod";
import { Invite } from "../../../entity/invite";
import { getExternalPathFromActor, sendActivity } from "../../../sender";
import { APError } from "../../../util/activitypub/error";
import { resolveWebfinger } from "../../../util/activitypub/resolve";
import {
	addContext,
	splitQualifiedMention,
} from "../../../util/activitypub/util";
import { getOrFetchGuild, joinGuild } from "../../../util/entity/guild";
import { route } from "../../../util/route";
import { makeInstanceUrl } from "../../../util/url";

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
						id: makeInstanceUrl(
							`${getExternalPathFromActor(req.user)}/invite/${req.params.invite_code}`,
						),
						type: "Follow",
						actor: makeInstanceUrl(
							getExternalPathFromActor(req.user),
						),
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
