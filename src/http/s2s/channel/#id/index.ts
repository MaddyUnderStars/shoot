import { Router } from "express";
import { z } from "zod";
import { Channel } from "../../../../entity/channel";
import { addContext, config, getDatabase, route } from "../../../../util";
import { handleChannelInbox } from "../../../../util/activitypub/channelinbox";
import { buildAPGroup } from "../../../../util/activitypub/transformers";

const router = Router({ mergeParams: true });

router.get(
	"/",
	route(
		{ params: z.object({ channel_id: z.string() }) },
		async (req, res) => {
			const { channel_id } = req.params;

			let channel = await getDatabase()
				.createQueryBuilder(Channel, "channels")
				.select("channels")
				.leftJoinAndSelect("channels.recipients", "recipients")
				.leftJoinAndSelect("channels.owner", "owner")
				.where("channels.id = :id", { id: channel_id })
				.andWhere("channels.domain = :domain", {
					domain: config.federation.webapp_url.hostname,
				})
				.getOneOrFail();

			return res.json(addContext(buildAPGroup(channel)));
		},
	),
);

router.post(
	"/inbox",
	route(
		{
			params: z.object({ channel_id: z.string() }),
			body: z.any(),
		},
		async (req, res) => {
			const channel = await getDatabase()
				.createQueryBuilder(Channel, "channels")
				.select("channels")
				.leftJoinAndSelect("channels.recipients", "recipients")
				.leftJoinAndSelect("channels.owner", "owner")
				.where("channels.id = :id", { id: req.params.channel_id })
				.andWhere("channels.domain = :domain", {
					domain: config.federation.webapp_url.hostname,
				})
				.getOneOrFail();

			await handleChannelInbox(req.body, channel);
			return res.status(200);
		},
	),
);

export default router;
