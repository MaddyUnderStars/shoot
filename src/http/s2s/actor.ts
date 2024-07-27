import { Router } from "express";
import { addContext, route } from "../../util";
import { InstanceActor } from "../../util/activitypub/instanceActor";
import { buildAPActor } from "../../util/activitypub/transformers";

const router = Router();

router.get(
	"/",
	route({}, (req, res) => {
		return res.json(
			addContext({
				...buildAPActor(InstanceActor),
				type: "Application",
			}),
		);
	}),
);

export default router;
