import { APCreate } from "activitypub-types";
import { Router } from "express";
import { z } from "zod";
import { DMChannel, PublicChannel } from "../../../../entity";
import { getExternalPathFromActor, sendActivity } from "../../../../sender";
import {
	addContext,
	buildAPGroup,
	config,
	getOrFetchUser,
	route,
} from "../../../../util";
import { createDmChannel } from "../../../../util/entity/channel";

const router = Router({ mergeParams: true });

const DMChannelCreate = z.object({
	name: z.string(),
});

// Creates a DM channel or returns an existing one between yourself and :user_id
router.post(
	"/",
	route(
		{
			body: DMChannelCreate,
			params: z.object({
				user_id: z.string(),
			}),
			response: PublicChannel,
		},
		async (req, res) => {
			const { user_id } = req.params;

			const existing = await DMChannel.findOne({
				where: [
					{ owner: { id: req.user.id } },
					{ recipients: { id: req.user.id } },
				],
			});

			if (existing) return res.json(existing.toPublic());

			const owner = req.user;
			const recipient = await getOrFetchUser(user_id);

			const channel = await createDmChannel(
				req.body.name,
				owner,
				[recipient],
				async () => {
					await sendActivity(
						channel.recipients,
						addContext({
							type: "Create",
							id: `${config.federation.instance_url.origin}${getExternalPathFromActor(channel)}/create`,
							actor: `${config.federation.instance_url.origin}${getExternalPathFromActor(channel.owner)}`,
							object: buildAPGroup(channel),
						}) as APCreate,
						channel.owner,
					);
				},
			);

			// TODO: federate channel creation
			// Probably create it locally and then send a Follow to recipient
			// Once we receive an Accept, they'll be properly added to the dm

			return res.json(channel.toPublic());
		},
	),
);

export default router;
