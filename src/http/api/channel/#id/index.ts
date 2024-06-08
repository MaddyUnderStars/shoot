import { APUpdate } from "activitypub-types";
import { Router } from "express";
import { z } from "zod";
import { Channel, PublicChannel } from "../../../../entity";
import { getExternalPathFromActor, sendActivity } from "../../../../sender";
import {
	PERMISSION,
	addContext,
	buildAPGroup,
	config,
	getOrFetchChannel,
	route,
} from "../../../../util";

const router = Router({ mergeParams: true });

const params = z.object({
	channel_id: z.string(),
});

router.get(
	"/",
	route(
		{
			params,
			response: PublicChannel,
		},
		async (req, res) => {
			const channel = await getOrFetchChannel(req.params.channel_id);

			channel.throwPermission(req.user, PERMISSION.VIEW_CHANNEL);

			return res.json(channel.toPublic());
		},
	),
);

export const ChannelModifySchema: z.ZodType<Partial<Channel>> = z.object({
	name: z.string(),
});

router.patch(
	"/",
	route({ params, body: ChannelModifySchema }, async (req, res) => {
		// TODO: if local channel, allow editing
		// Otherwise, send a Update activity to the channel
		// and then update the local representation when we receive an Acknowledge activity

		const channel = await getOrFetchChannel(req.params.channel_id);

		channel.throwPermission(req.user, PERMISSION.MANAGE_CHANNELS);

		if (channel.domain == config.federation.webapp_url.hostname) {
			// This is a local channel

			await Channel.update({ id: channel.id }, req.body);
			return res.sendStatus(200);
		}

		// send Update

		channel.assign(req.body);

		// TODO: refactor buildAP* transformers
		// to allow for building remote objects
		// ( the ID hostname and such shouldn't be ours constantly )

		const apchannel = buildAPGroup(channel);

		await sendActivity(
			channel,
			addContext({
				type: "Update",
				// TOOD: random id
				id: `${config.federation.instance_url.origin}${getExternalPathFromActor(req.user)}/update/${channel.id}`,
				actor: `${config.federation.instance_url.origin}${getExternalPathFromActor(req.user)}`,
				to: apchannel.id,
				object: apchannel,
			} as APUpdate),
			req.user,
		);

		return res.sendStatus(202);
	}),
);

export default router;
