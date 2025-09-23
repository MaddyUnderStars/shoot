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
import { config } from "../../../util/config";
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

			let inviteCode: string;
			let domain: string;

			if (req.params.invite_code.includes("@")) {
				const split = splitQualifiedMention(req.params.invite_code);
				inviteCode = split.id;
				domain = split.domain;
			} else {
				inviteCode = req.params.invite_code;
				domain = config.federation.instance_url.origin;
			}

			const invite = await Invite.findOne({
				where: {
					code: inviteCode,
				},
				select: {
					guild: {
						id: true,
						domain: true,
					},
				},
				relations: {
					guild: true,
				},
			});

			if (!invite) {
				const obj = await resolveWebfinger(
					`invite:${inviteCode}@${domain}`,
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

			await joinGuild(req.user.mention, invite.guild.mention);

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
