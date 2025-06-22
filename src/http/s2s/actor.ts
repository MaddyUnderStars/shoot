import { Router } from "express";
import { InstanceActor } from "../../util/activitypub/instanceActor";
import { buildAPActor } from "../../util/activitypub/transformers/actor";
import { addContext } from "../../util/activitypub/util";
import { route } from "../../util/route";

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
