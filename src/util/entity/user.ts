import bcrypt from "bcrypt";
import { User } from "../../entity/user";
import { config } from "../config";

import {
	type APActor,
	type APNote,
	type APPerson,
	ObjectIsGroup,
} from "activitypub-types";
import type { InstanceInvite } from "../../entity/instanceInvite";
import type { ActorMention } from "../activitypub/constants";
import { APError } from "../activitypub/error";
import {
	resolveAPObject,
	resolveId,
	resolveWebfinger,
} from "../activitypub/resolve";
import { APObjectIsActor, splitQualifiedMention } from "../activitypub/util";
import { createLogger } from "../log";
import { generateSigningKeys } from "./actor";

const Log = createLogger("users");

export const registerUser = async (
	username: string,
	password: string,
	email?: string,
	awaitKeyGeneration = false,
	instanceInvite?: InstanceInvite,
) => {
	const user = await User.create({
		name: username,
		email,
		password_hash: await bcrypt.hash(password, 12),
		public_key: "", // The key has yet to be generated.
		invite: instanceInvite,

		display_name: username,
		valid_tokens_since: new Date(),
		domain: config.federation.webapp_url.hostname,
	}).save();

	if (awaitKeyGeneration) await generateSigningKeys(user);
	else setImmediate(() => generateSigningKeys(user));

	Log.verbose(`User '${user.name}' registered`);
	return user;
};

export const getOrFetchUser = async (lookup: ActorMention | URL | APPerson) => {
	const id = resolveId(lookup);

	if (!id) throw new APError("Cannot fetch user with undefined ID");

	const mention = splitQualifiedMention(id);

	let user = await User.findOne({
		where: {
			name: mention.user,
			domain: mention.domain,
		},
	});

	if (!user && config.federation.enabled) {
		// Fetch from remote instance
		user = await createUserForRemotePerson(lookup);
		await user.save();
	} else if (!user) {
		throw new APError("User could not be found", 404);
	}

	return user;
};

export const batchGetUsers = async (users: ActorMention[]) => {
	return Promise.all(users.map((user) => getOrFetchUser(user)));
};

export const createUserForRemotePerson = async (
	lookup: string | URL | APActor,
) => {
	const id = resolveId(lookup);

	const mention = splitQualifiedMention(id);

	const obj =
		typeof lookup === "object"
			? await resolveAPObject(lookup)
			: id instanceof URL
				? await resolveAPObject(id)
				: await resolveWebfinger(id);

	if (!APObjectIsActor(obj))
		throw new APError("Resolved object is not Person");

	if (ObjectIsGroup(obj))
		throw new APError(
			"Refusing to treat Group as Person as Group is our native channel type",
		);

	if (!obj.publicKey?.publicKeyPem)
		throw new APError(
			"Resolved object is Person but does not contain public key",
		);

	if (!obj.id) throw new APError("Resolved object must have ID");

	if (typeof obj.inbox !== "string" || typeof obj.outbox !== "string")
		throw new APError("don't know how to handle embedded inbox/outbox");

	return User.create({
		domain: mention.domain,

		remote_address: obj.id,

		name: obj.preferredUsername || mention.user,
		display_name: obj.name || obj.preferredUsername || mention.user,
		summary: obj.summary,

		public_key: obj.publicKey.publicKeyPem,

		collections: {
			inbox: obj.inbox,
			shared_inbox: obj.endpoints?.sharedInbox,
			outbox: obj.outbox,
			followers: obj.followers?.toString(),
			following: obj.following?.toString(),
		},
	});
};

export const getOrFetchAttributedUser = async (
	attributed: APNote["attributedTo"],
) => {
	if (!attributed)
		throw new APError("Note must have attributedTo to assign author");
	if (Array.isArray(attributed))
		throw new APError(
			"Cannot assign single author to this note with multiple attributedTo",
		);

	if (typeof attributed === "string")
		return await getOrFetchUser(resolveId(attributed));

	if (!APObjectIsActor(attributed))
		throw new APError("note.attributedTo must be actor");

	return await createUserForRemotePerson(attributed);
};
