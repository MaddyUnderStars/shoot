import { ObjectIsPerson } from "activitypub-types";
import { Response, Router } from "express";
import { z } from "zod";
import { PublicUser, User } from "../../../../entity";
import { APError, HttpError, config, resolveWebfinger, route, splitQualifiedMention } from "../../../../util";

const router = Router();

router.get(
	"/:user_id",
	route(
		{
			params: z.object({
				user_id: z.string(),
			}),
		},
		async (req, res: Response<PublicUser>) => {
			const { user_id } = req.params;

			const mention = splitQualifiedMention(user_id);

			let user = await User.findOne({ where: { 
				username: mention.user,
				domain: mention.domain
			}});

			if (!user && config.federation.enabled) {
				// Fetch from remote instance
				const obj = await resolveWebfinger(user_id);
				if (!ObjectIsPerson(obj)) throw new APError("Resolved object was not person");
				user = await User.create({
					username: obj.preferredUsername,
					display_name: obj.name || obj.preferredUsername,
					domain: mention.domain,
				}).save();
			}
			else if (!user) {
				throw new HttpError("User could not be found", 404);
			}

			return res.json(user.toPublic());
		},
	),
);

export default router;
