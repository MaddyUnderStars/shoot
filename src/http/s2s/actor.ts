import { Router } from "express";
import { addContext, route } from "../../util";
import { InstanceActor } from "../../util/activitypub/instanceActor";
import { buildAPPerson } from "../../util/activitypub/transformers";

const router = Router();

router.get(
	"/",
	route({}, (req, res) => {
		return res.json(
			addContext({
				...buildAPPerson(InstanceActor),
				type: "Application",
			}),
		);
	}),
);

export default router;
