import type { APActivity } from "activitypub-types";
import { type Actor, Channel, Guild, User } from "../entity";
import { APError, InstanceActor, signWithHttpSignature } from "../util";
import { createLogger } from "../util/log";

const Log = createLogger("ap:distribute");

export const sendActivity = async (
	targets: Actor | Actor[],
	activity: APActivity,
	sender: Actor = InstanceActor,
) => {
	targets = Array.isArray(targets) ? targets : [targets];

	const inboxes = targets.reduce<Set<string>>((ret, target) => {
		const shared_inbox = target.collections?.shared_inbox;
		const inbox = target.collections?.inbox;

		// If the shared inbox doesn't exist, add the inbox
		if (!shared_inbox && inbox) ret.add(inbox);
		// If we have a shared inbox, and this activity is going to another actor with the same shared inbox, use that
		else if (
			shared_inbox &&
			targets.filter((x) => x.collections?.shared_inbox === shared_inbox)
				.length > 1
		)
			ret.add(shared_inbox);
		// otherwise, just add the inbox
		else if (inbox) ret.add(inbox);

		return ret;
	}, new Set());

	for (const inbox of inboxes) {
		const signed = signWithHttpSignature(
			inbox,
			"POST",
			sender,
			JSON.stringify(activity),
		);

		const res = await fetch(inbox, signed);
		if (!res.ok) {
			Log.error(
				`Sending activity ${activity.id} to ${inbox} failed : ${res.status} ${await res.text()}`,
			);
		} else
			Log.verbose(
				`Sent activity ${activity.id} got response`,
				await res.text(),
			);
	}
};

export const getExternalPathFromActor = (actor: Actor) => {
	if (actor.id === InstanceActor.id) return "/actor";
	if (actor instanceof Channel) return `/channel/${actor.id}`;
	if (actor instanceof User) return `/users/${actor.name}`;
	if (actor instanceof Guild) return `/guild/${actor.id}`;
	throw new APError("unknown actor type");
};
