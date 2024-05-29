import { APActivity } from "activitypub-types";
import { Actor, Channel, Guild, User } from "../entity";
import { APError, HttpSig, InstanceActor, config } from "../util";
import { createLogger } from "../util/log";

const Log = createLogger("ap:distribute");

export const sendActivity = async (
	targets: Actor | Actor[],
	activity: APActivity,
	sender?: Actor,
) => {
	targets = Array.isArray(targets) ? targets : [targets];

	// todo: handle shared inbox

	sender = sender ?? InstanceActor;

	for (const target of targets) {
		if (
			!target.remote_address ||
			target.domain == config.federation.instance_url.hostname
		)
			continue;

		const inbox =
			target.collections?.inbox ?? target.collections?.shared_inbox;

		if (!inbox) {
			Log.warn(
				`actor with local id ${target.id} could not be delivered ` +
					`${activity.id} because they do not have an inbox`,
			);
			continue;
		}

		const signed = HttpSig.sign(inbox, "POST", sender, activity);

		const res = await fetch(inbox, signed);
		if (!res.ok) {
			Log.error(
				`Sending activity ${activity.id} to ${inbox} failed : ${res.status} ${res.statusText}`,
			);

			// https://github.com/node-fetch/node-fetch/issues/83
			// fix memory leak by reading the buffer
			const leak = await res.arrayBuffer();
		} else
			Log.verbose(
				`Sent activity ${activity.id} got response`,
				await res.text(),
			);
	}
};

export const getExternalPathFromActor = (actor: Actor) => {
	if (actor.id == InstanceActor.id) return "/actor";
	if (actor instanceof Channel) return `/channel/${actor.id}`;
	if (actor instanceof User) return `/users/${actor.name}`;
	if (actor instanceof Guild) return `/guild/${actor.id}`;
	throw new APError("unknown actor type");
};
