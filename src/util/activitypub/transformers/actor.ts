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
import { APError } from "../error";
import { InstanceActor } from "../instanceActor";
import { makeInstanceUrl, makeWebappUrl } from "../../url";

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
		attributedTo = makeInstanceUrl(getExternalPathFromActor(actor.owner));
	else if (actor instanceof GuildTextChannel)
		attributedTo = makeInstanceUrl(getExternalPathFromActor(actor.guild));

	const webfinger =
		actor instanceof User && !isInstanceActor
			? `${actor.name}@${config.federation.webapp_url.hostname}`
			: undefined;

	const inbox = isInstanceActor
		? makeInstanceUrl("/inbox")
		: makeInstanceUrl(`${id}/inbox`);

	const outbox = isInstanceActor
		? makeInstanceUrl("/outbox")
		: makeInstanceUrl(`${id}/outbox`);

	return {
		preferredUsername,
		name,
		attributedTo,
		webfinger,

		type: getAPTypeFromActor(actor),
		id: makeInstanceUrl(id),
		url: makeWebappUrl(id),

		published: actor.created_date.toISOString(),

		inbox,
		outbox,

		followers: isInstanceActor
			? undefined
			: makeInstanceUrl(`${id}/followers`),
		following: isInstanceActor
			? undefined
			: makeInstanceUrl(`${id}/following`),

		endpoints: {
			sharedInbox: makeInstanceUrl("/inbox"),
		},

		publicKey: {
			id: makeInstanceUrl(id),
			owner: makeWebappUrl(id),
			publicKeyPem: actor.public_key,
		},
	};
};
