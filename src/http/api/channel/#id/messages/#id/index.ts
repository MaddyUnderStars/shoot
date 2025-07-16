import { ObjectIsNote } from "activitypub-types";
import { Router } from "express";
import { z } from "zod";
import { Message, PublicMessage } from "../../../../../../entity/message";
import { ActorMention } from "../../../../../../util/activitypub/constants";
import { APError } from "../../../../../../util/activitypub/error";
import { resolveAPObject } from "../../../../../../util/activitypub/resolve";
import { buildMessageFromAPNote } from "../../../../../../util/activitypub/transformers/message";
import { getOrFetchChannel } from "../../../../../../util/entity/channel";
import { emitGatewayEvent } from "../../../../../../util/events";
import { PERMISSION } from "../../../../../../util/permission";
import { route } from "../../../../../../util/route";
import { makeUrl, tryParseUrl } from "../../../../../../util/url";

const router = Router({ mergeParams: true });

const MessageRequestParams = z.object({
	channel_id: ActorMention,
	message_id: z.string().uuid(),
});

router.get(
	"/",
	route(
		{
			params: MessageRequestParams,
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

			if (!message && channel.isRemote() && channel.remote_address) {
				// If this is a remote channel, fetch the message from them
				// The remote message may be cached

				// TODO: this has an obvious flaw, you can't do webfinger for messages
				// so we need to just guess the remote message URL
				// and that will only realistically work for shoot
				// although I suppose if you're calling this method, you likely already discovered the message
				// through GET /channel/:id/messages and so the message is already in cache and would've
				// been hit above. so probably fine?
				// If you could filter a channels outbox somehow, that would be maybe more portable
				const obj = await resolveAPObject(
					makeUrl(
						`/message/${req.params.message_id}`,
						tryParseUrl(channel.remote_address) as URL,
					),
				);

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

router.delete(
	"/",
	route(
		{
			params: MessageRequestParams,
		},
		async (req, res) => {
			const channel = await getOrFetchChannel(req.params.channel_id);

			if (channel.isRemote()) {
				/*
					Probably do not want to delete optimistically?
					I'm thinking flow should be:
					Delete<Note> -> wait for Ack -> MESSAGE_DELETE event
					but we should maybe mark it as to be deleted in the UI?
				*/

				throw new APError("TODO: federation message deletion");
			}

			const message = await Message.findOneOrFail({
				where: {
					channel: { id: channel.id },
					id: req.params.message_id,
				},
			});

			// we can always delete our own messages
			if (message.author.id !== req.user.id)
				await channel.throwPermission(req.user, [
					PERMISSION.MANAGE_MESSAGES,
				]);

			emitGatewayEvent(channel.id, {
				type: "MESSAGE_DELETE",
				message_id: message.id,
				channel: channel.mention,
			});

			await message.remove();

			return res.sendStatus(204);
		},
	),
);

export default router;
