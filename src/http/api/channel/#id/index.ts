import { Router } from "express";
import { z } from "zod";
import { Channel, PublicChannel } from "../../../../entity";
import {
	HttpError,
	PERMISSION,
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

const ChannelModifySchema: z.ZodType<Partial<Channel>> = z.object({
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
		} else {
			throw new HttpError("Not implemented", 500);
		}

		// TODO: federate Update channel activity to remote server
		return res.sendStatus(202);
	}),
);

export default router;
