import type { APActor } from "activitypub-types";
import {
	type Actor,
	Channel,
	DMChannel,
	Guild,
	GuildTextChannel,
	User,
} from "../../../entity";
import { getExternalPathFromActor } from "../../../sender";
import { config } from "../../config";
import { createXsdDate } from "../../misc";
import { APError } from "../error";
import { InstanceActor } from "../instanceActor";

const getAPTypeFromActor = (actor: Actor) => {
	if (actor.id === InstanceActor.id) return "Application";
	if (actor instanceof User) return "Person";
	if (actor instanceof Channel) return "Group";
	if (actor instanceof Guild) return "Organization";
};

export const buildAPActor = (actor: Actor): APActor => {
	if (actor.remote_address)
		throw new APError(
			"Tried to create an AP object for a remote resource.",
		);

	const isInstanceActor = actor.id === InstanceActor.id;

	const id = getExternalPathFromActor(actor);

	const { webapp_url, instance_url } = config.federation;

	const preferredUsername = actor instanceof User ? actor.name : actor.id;

	// preference: display_name, name, id
	const name =
		"display_name" in actor && typeof actor.display_name === "string"
			? actor.display_name
			: "name" in actor && typeof actor.name === "string"
				? actor.name
				: actor.id;

	let attributedTo: string | undefined;
	if (actor instanceof DMChannel || actor instanceof Guild)
		attributedTo = `${instance_url.origin}${getExternalPathFromActor(actor.owner)}`;
	else if (actor instanceof GuildTextChannel)
		attributedTo = `${instance_url.origin}${getExternalPathFromActor(actor.guild)}`;

	const webfinger =
		actor instanceof User && !isInstanceActor
			? `${actor.name}@${config.federation.webapp_url.hostname}`
			: undefined;

	const inbox = isInstanceActor
		? `${instance_url.origin}/inbox`
		: `${instance_url.origin}${id}/inbox`;

	const outbox = isInstanceActor
		? `${instance_url.origin}/outbox`
		: `${instance_url.origin}${id}/outbox`;

	return {
		preferredUsername,
		name,
		attributedTo,
		webfinger,

		type: getAPTypeFromActor(actor),
		id: `${instance_url.origin}${id}`,
		url: `${webapp_url.origin}${id}`,

		published: createXsdDate(actor.created_date),

		inbox,
		outbox,

		followers: isInstanceActor
			? undefined
			: `${instance_url.origin}${id}/followers`,
		following: isInstanceActor
			? undefined
			: `${instance_url.origin}${id}/following`,

		endpoints: {
			sharedInbox: `${instance_url.origin}/inbox`,
		},

		publicKey: {
			id: `${instance_url.origin}${id}`,
			owner: `${webapp_url.origin}${id}`,
			publicKeyPem: actor.public_key,
		},
	};
};
