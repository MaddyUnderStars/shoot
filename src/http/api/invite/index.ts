import { type APFollow, ObjectIsOrganization } from "activitypub-types";
import { Router } from "express";
import { z } from "zod";
import { Invite } from "../../../entity/invite.js";
import { getExternalPathFromActor, sendActivity } from "../../../sender/index.js";
import { APError } from "../../../util/activitypub/error.js";
import { resolveWebfinger } from "../../../util/activitypub/resolve.js";
import { addContext, splitQualifiedMention } from "../../../util/activitypub/util.js";
import { config } from "../../../util/config.js";
import { getOrFetchGuild, joinGuild } from "../../../util/entity/guild.js";
import { PERMISSION } from "../../../util/permission.js";
import { route } from "../../../util/route.js";
import { makeInstanceUrl } from "../../../util/url.js";
import { ObjectIsInvite } from "../../../util/activitypub/transformers/invite.js";

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
				domain = config().federation.webapp_url.origin;
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
				const obj = await resolveWebfinger(`invite:${inviteCode}@${domain}`);
				if (!ObjectIsInvite(obj))
					throw new APError("Remote did not respond with GuildInvite");

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
						actor: makeInstanceUrl(getExternalPathFromActor(req.user)),
						object: guild.remote_address,
						instrument: req.params.invite_code,
					} as APFollow),
					req.user,
				);

				res.sendStatus(202);
				return;
			}

			await joinGuild(req.user.mention, invite.guild.mention);

			res.sendStatus(204);
			return;
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

			const invite = await Invite.findOneOrFail({
				where: {
					code: invite_code,
				},
				relations: {
					guild: true,
				},
			});

			await invite.guild.throwPermission(req.user, PERMISSION.MANAGE_INVITES);

			await invite.remove();

			return res.sendStatus(200);
		},
	),
);

export default router;
