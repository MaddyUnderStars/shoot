import { Router } from "express";
import { z } from "zod";
import { ActorMention } from "../../../../util/activitypub/constants";
import { config } from "../../../../util/config";
import { getOrFetchChannel } from "../../../../util/entity/channel";
import { PERMISSION } from "../../../../util/permission";
import { route } from "../../../../util/route";
import { askForMediaToken, generateMediaToken } from "../../../../util/voice";

const router = Router({ mergeParams: true });

export const MediaTokenResponse = z.object({
	token: z.string(),
	ip: z.string(),
});

router.post(
	"/",
	route(
		{
			params: z.object({
				channel_id: ActorMention,
			}),
			response: MediaTokenResponse,
			errors: { 202: z.literal("Accepted") },
		},
		async (req, res) => {
			const channel = await getOrFetchChannel(req.params.channel_id);

			await channel.throwPermission(req.user, PERMISSION.CALL_CHANNEL);

			// If this channel is remote, we have to request the token from them
			// It'll be delivered to our inbox, and we can send it to the client over gateway
			if (channel.isRemote()) {
				await askForMediaToken(req.user, channel);
				return res.sendStatus(202);
			}

			const token = await generateMediaToken(
				req.user.mention,
				channel.id,
			);

			// TODO
			return res.json({ token, ip: config.webrtc.signal_address || "" });
		},
	),
);

export default router;
