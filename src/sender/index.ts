import type { APActivity } from "activitypub-types";
import { type Actor, Channel, Guild, User } from "../entity";
import { APError, InstanceActor, config, signWithHttpSignature } from "../util";
import { createLogger } from "../util/log";

const Log = createLogger("ap:distribute");

export const sendActivity = async (
	targets: Actor | Actor[],
	activity: APActivity,
	sender: Actor = InstanceActor,
) => {
	targets = Array.isArray(targets) ? targets : [targets];

	// TODO: rewrite the below shared inbox code
	const instances = targets.reduce((ret, target) => {
		if (
			!target.remote_address ||
			target.domain === config.federation.instance_url.hostname
		)
			return ret;

		ret.add(new URL(target.remote_address).hostname);

		return ret;
	}, new Set());

	const inboxes = targets.reduce<Set<string>>((ret, target) => {
		if (!target.remote_address) return ret; // not possible

		const shared = target.collections?.shared_inbox;
		const inbox = target.collections?.inbox;
		if (!inbox && !shared) {
			Log.warn(
				`${activity.id} could not be delivered to ${target.id} as it does not have an inbox`,
			);
			return ret;
		}

		if (instances.has(new URL(target.remote_address).hostname) && shared) {
			ret.add(shared);
			return ret;
		}

		if (inbox) ret.add(inbox);
		else
			Log.warn(
				`${activity.id} could not be delivered to ${target.id} as it does not have an inbox`,
			);

		return ret;
	}, new Set());

	for (const inbox of inboxes) {
		const signed = signWithHttpSignature(inbox, "POST", sender, activity);

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
