import { APActivity } from "activitypub-types";
import { Actor, Channel, User } from "../entity";
import { APError, HttpSig, InstanceActor } from "../util";
import { createLogger } from "../util/log";

const Log = createLogger("ap:distribute");

export const sendActivity = async (
	targets: URL | URL[],
	activity: APActivity,
	sender?: Actor,
) => {
	targets = Array.isArray(targets) ? targets : [targets];

	sender = sender ?? InstanceActor;

	for (const target of targets) {
		const signed = HttpSig.sign(
			target.toString(),
			"POST",
			sender,
			getExternalPathFromActor(sender),
			activity,
		);

		const res = await fetch(target, signed);
		if (!res.ok)
			Log.error(
				`Sending activity to ${target} failed : ${res.status} ${res.statusText}`,
			);
	}
};

export const getExternalPathFromActor = (actor: Actor) => {
	if (actor.id == InstanceActor.id) return "/actor";
	if (actor instanceof Channel) return `/channel/${actor.id}`;
	if (actor instanceof User) return `/users/${actor.name}`;
	throw new APError("unknown actor type");
};
