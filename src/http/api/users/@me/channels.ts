import { Router } from "express";
import { Channel, PublicChannel } from "../../../../entity";
import { getDatabase, route } from "../../../../util";

const router = Router({ mergeParams: true });

router.get(
	"/",
	route(
		{
			response: PublicChannel.array(),
		},
		async (req, res) => {
			// this is so bad
			const channels = await getDatabase()
				.createQueryBuilder(Channel, "channels")
				.select("channels")
				.leftJoinAndSelect("channels.recipients", "recipients")
				.leftJoinAndSelect("channels.owner", "owner")
				.where("channels.owner.id = :user_id", { user_id: req.user.id })
				.orWhere("recipients.id = :id", { id: req.user.id })
				// TODO: or are in recipients
				.getMany();

			return res.json(channels.map((x) => x.toPublic()));
		},
	),
);

export default router;
