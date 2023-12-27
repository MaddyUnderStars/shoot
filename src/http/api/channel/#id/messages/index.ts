import { Router } from "express";
import { z } from "zod";
import { Message } from "../../../../../entity";
import { DMChannel } from "../../../../../entity/DMChannel";
import { addContext, config, createLogger, route } from "../../../../../util";
import { HttpSig } from "../../../../../util/activitypub/httpsig";
import {
	buildAPAnnounceNote,
	buildAPNote
} from "../../../../../util/activitypub/transformers";
import { getOrFetchChannel } from "../../../../../util/entity/channel";

const MessageCreate = z.object({
	content: z.string(),
});

const router = Router({ mergeParams: true });

const Log = createLogger("activitypub");

// Create a message in a channel
router.post(
	"/",
	route(
		{ body: MessageCreate, params: z.object({ channel_id: z.string() }) },
		async (req, res) => {
			const { channel_id } = req.params;

			const channel = await getOrFetchChannel(channel_id);

			const message = Message.create({
				channel,

				content: req.body.content,
				author: req.user,
			});

			await message.save();

			if (config.federation.enabled) {
				// todo: move
				// send this activity to remote instances

				const note = buildAPNote(message);
				const announce = buildAPAnnounceNote(note, message.channel.id);
				const withContext = addContext(announce);

				// TODO: fix
				let inbox: string;
				if (channel instanceof DMChannel)
					inbox = channel.recipients[0].collections.inbox;
				else throw new Error("unimplemented");

				const signed = HttpSig.sign(inbox, req.method, channel, `/channel/${channel.id}`, withContext);

				setImmediate(async () => {
					const res = await fetch(
						inbox,
						signed,
					);
					if (!res.ok)
						Log.error(
							`Error sending message to ${inbox}`,
							await res.text(),
						);
				});
			}

			return res.json(message.toPublic());
		},
	),
);

export default router;
