import { Router } from "express";
import { z } from "zod";
import { Message } from "../../../../../../entity";
import { buildAPNote, config, route } from "../../../../../../util";

const router = Router({ mergeParams: true });

router.get(
	"/",
	route(
		{
			params: z.object({
				channel_id: z.string(),
				message_id: z.string(),
			}),
		},
		async (req, res) => {
			const { channel_id, message_id } = req.params;

			const msg = await Message.findOneOrFail({
				where: {
					id: message_id,
					channel: {
						id: channel_id,
						domain: config.federation.webapp_url.hostname
					},
				},
				relations: {
					channel: true,
					author: true,
				}
			});

			return res.json(buildAPNote(msg));
		},
	),
);

export default router;
