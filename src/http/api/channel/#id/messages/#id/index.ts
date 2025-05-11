import { ObjectIsNote } from "activitypub-types";
import { Router } from "express";
import { z } from "zod";
import { Message, PublicMessage } from "../../../../../../entity";
import {
	APError,
	PERMISSION,
	buildMessageFromAPNote,
	getOrFetchChannel,
	resolveAPObject,
	route,
} from "../../../../../../util";

const router = Router({ mergeParams: true });

router.get(
	"/",
	route(
		{
			params: z.object({
				channel_id: z.string(),
				message_id: z.string(),
			}),
			response: PublicMessage,
		},
		async (req, res) => {
			const channel = await getOrFetchChannel(req.params.channel_id);

			await channel.throwPermission(req.user, [PERMISSION.VIEW_CHANNEL]);

			let message = await Message.findOne({
				where: {
					channel: { id: channel.id },
					id: req.params.message_id,
				},
				loadRelationIds: {
					relations: ["channel", "author"],
					disableMixedMap: true,
				},
			});

			if (!message && channel.isRemote()) {
				// If this is a remote channel, fetch the message from them
				// The remote message may be cached

				// TODO: this has an obvious flaw, you can't do webfinger for messages
				// so we need to just guess the remote message URL
				// and that will only realistically work for shoot
				// although I suppose if you're calling this method, you likely already discovered the message
				// through GET /channel/:id/messages and so the message is already in cache and would've
				// been hit above. so probably fine?
				// If you could filter a channels outbox somehow, that would be maybe more portable
				const messageUrl = `${channel.remote_address}/message/${req.params.message_id}`;
				const obj = await resolveAPObject(messageUrl);

				if (!ObjectIsNote(obj)) {
					throw new APError("Remote did not return a Note object");
				}

				message = await buildMessageFromAPNote(obj, channel);
				await message.save();
			}

			if (!message) {
				return res.sendStatus(404);
			}

			return res.json(message.toPublic());
		},
	),
);

export default router;
