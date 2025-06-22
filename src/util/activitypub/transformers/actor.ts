import type { APActor } from "activitypub-types";
import { DMChannel } from "../../../entity/DMChannel";
import type { Actor } from "../../../entity/actor";
import { Channel } from "../../../entity/channel";
import { Guild } from "../../../entity/guild";
import { GuildTextChannel } from "../../../entity/textChannel";
import { User } from "../../../entity/user";
import { getExternalPathFromActor } from "../../../sender";
import { config } from "../../config";
import { makeInstanceUrl, makeWebappUrl } from "../../url";
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

		// All Shoot actors manually approve followers:
		// - Guilds/channels require invite codes (`instrument`)
		// - Users receive friend requests like other chat apps
		// Perhaps this could be a user setting in the future
		// for if for example, Shoot allowed short-form posting as well to a user profile
		// But for now, this is out of scope
		manuallyApprovesFollowers: true,

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
			owner: makeInstanceUrl(id),
			publicKeyPem: actor.public_key,
		},
	};
};
