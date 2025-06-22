import { Router } from "express";
import { z } from "zod";
import { Channel, GuildTextChannel, PublicChannel } from "../../../../entity";
import {
	HttpError,
	PERMISSION,
	config,
	emitGatewayEvent,
	getOrFetchChannel,
	route,
	updateChannelOrdering,
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

			await channel.throwPermission(req.user, PERMISSION.VIEW_CHANNEL);

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

		await channel.throwPermission(req.user, PERMISSION.MANAGE_CHANNELS);

		if (channel.domain === config.federation.webapp_url.hostname) {
			// This is a local channel

			channel.assign(req.body);
			await Channel.update({ id: channel.id }, req.body);

			emitGatewayEvent(
				channel instanceof GuildTextChannel
					? channel.guild.id
					: channel.id,
				{
					type: "CHANNEL_UPDATE",
					channel: channel.toPublic(),
				},
			);

			return res.sendStatus(204);
		}

		throw new HttpError("Not implemented", 500);

		// TODO: federate Update channel activity to remote server
		//return res.sendStatus(204);
	}),
);

router.delete(
	"/",
	route({ params }, async (req, res) => {
		const channel = await getOrFetchChannel(req.params.channel_id);

		await channel.throwPermission(req.user, PERMISSION.MANAGE_CHANNELS);

		// after a .remove, the id is made undefined but other properties are not
		emitGatewayEvent(channel.id, {
			type: "CHANNEL_DELETE",
			channel_id: channel.mention,
			guild_id:
				channel instanceof GuildTextChannel
					? channel.guild.mention
					: undefined,
		});

		await channel.remove();

		if (channel instanceof GuildTextChannel)
			await updateChannelOrdering(channel.guild.id);

		res.sendStatus(204);
	}),
);

export default router;
