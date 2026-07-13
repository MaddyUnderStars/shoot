import { Router } from "express";
import { InstanceActor } from "../../util/activitypub/instanceActor.js";
import { buildAPActor } from "../../util/activitypub/transformers/actor.js";
import { addContext } from "../../util/activitypub/util.js";
import { route } from "../../util/route.js";

const router = Router();

router.get(
	"/",
	route({}, (_req, res) => {
		return res.json(
			addContext({
				...buildAPActor(InstanceActor),
				type: "Application",
			}),
		);
	}),
);

export default router;
