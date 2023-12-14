/**
 * TEMP ROUTES FOR TESTING AP
 */

import { Router } from "express";
import { z } from "zod";
import { Message } from "../../../../../entity";
import {
	addContext,
	config,
	getOrCreateUser,
	route
} from "../../../../../util";
import { HttpSig } from "../../../../../util/activitypub/httpsig";
import { buildAPCreateNote, buildAPNote } from "../../../../../util/activitypub/transformers";

const router = Router({ mergeParams: true });

const MessageCreate = z.object({
	content: z.string(),
});

router.post(
	"/",
	route(
		{
			body: MessageCreate,
			params: z.object({
				user_id: z.string(),
			}),
		},
		async (req, res) => {
			const { user_id } = req.params;

			const to = await getOrCreateUser(user_id);

			const message = Message.create({
				to,
				
				content: req.body.content,
				author: req.user,
			});

			await message.save();

			if (config.federation.enabled) {
				// todo: move
				// send this activity to remote instances

				const note = buildAPNote(message);
				const create = buildAPCreateNote(note);
				const withContext = addContext(create);

				const signed = HttpSig.sign(to.activitypub_addresses.inbox, req.user, withContext);

				setImmediate(async  () => {
					const res = await fetch(to.activitypub_addresses.inbox, signed);
					console.log(await res.text());
				})
			}

			return res.json(message.toPublic());
		},
	),
);

export default router;
