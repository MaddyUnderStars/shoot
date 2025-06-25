import crypto from "node:crypto";
import type { IncomingHttpHeaders } from "node:http";
import type { Actor } from "../../entity/actor";
import { Channel } from "../../entity/channel";
import { Guild } from "../../entity/guild";
import { User } from "../../entity/user";
import { getExternalPathFromActor } from "../../sender";
import { createChannelFromRemoteGroup } from "../entity/channel";
import { createGuildFromRemoteOrg } from "../entity/guild";
import { createUserForRemotePerson } from "../entity/user";
import { createLogger } from "../log";
import { makeInstanceUrl, tryParseUrl } from "../url";
import { ACTIVITYPUB_FETCH_OPTS } from "./constants";
import { APError } from "./error";
import { throwInstanceBlock } from "./instances";
import { resolveAPObject } from "./resolve";
import { APObjectIsActor } from "./util";

const Log = createLogger("HTTPSIG");

const getSignString = <T extends IncomingHttpHeaders>(
	target: string,
	method: string,
	headers: T,
	names: string[],
) => {
	const requestTarget = `${method.toLowerCase()} ${target}`;
	headers = {
		...headers,
		"(request-target)": requestTarget,
	};

	return names
		.map((header) => `${header.toLowerCase()}: ${headers[header]}`)
		.join("\n");
};

// TODO: Support hs2019 algo
export const validateHttpSignature = async (
	target: string,
	method: string,
	requestHeaders: IncomingHttpHeaders,
	rawActivity?: Buffer,
	noCache = false,
): Promise<Actor> => {
	// TODO: it would be good to supply a custom error here
	const activity = rawActivity ? JSON.parse(rawActivity.toString()) : null;

	const date = requestHeaders.date;
	const sigHeader = requestHeaders.signature?.toString();

	if (!date || !sigHeader) throw new APError("Missing signature");

	const ONE_DAY = 24 * 60 * 60 * 1000;
	const dateParsed = Date.parse(date).valueOf();
	if (dateParsed > Date.now() + ONE_DAY || dateParsed < Date.now() - ONE_DAY)
		throw new APError("Signature was created gt/lt 1 day from now");

	const sigOpts: { [key: string]: string | undefined } = Object.assign(
		{},
		...sigHeader
			.split(",")
			.flat()
			.map((keyVal) => {
				const split = keyVal.split("=");
				return {
					[split[0]]: split[1].replaceAll('"', ""),
				};
			}),
	);

	const { signature, headers, keyId, algorithm } = sigOpts;

	if (!signature || !headers || !keyId)
		throw new APError("Invalid signature");

	const ALLOWED_ALGOS = ["rsa-sha256", "hs2019"];

	// If it's provided, check it. otherwise just assume it's sha256
	if (algorithm && !ALLOWED_ALGOS.includes(algorithm))
		throw new APError(`Unsupported encryption algorithm ${algorithm}`);

	const url = new URL(keyId);
	const actorId = `${url.origin}${url.pathname}`; // TODO: possibly wrong

	// check if this instance is blocked before we do anything intensive
	throwInstanceBlock(url);

	// check the inner object as well
	if (activity && "object" in activity) {
		let tryUrl: URL | null = null;
		if (typeof activity.object === "string")
			tryUrl = tryParseUrl(activity.object);
		else if (
			activity.object &&
			"id" in activity.object &&
			activity.object.id
		)
			tryUrl = tryParseUrl(activity.object.id);

		if (tryUrl) throwInstanceBlock(tryUrl);
	}

	const [user, channel, guild] = await Promise.all([
		User.findOne({ where: { remote_address: actorId } }),
		Channel.findOne({ where: { remote_address: actorId } }),
		Guild.findOne({ where: { remote_address: actorId } }),
	]);

	let actor: Actor | null = user ?? channel ?? guild;
	const actorWasCached = !!actor;

	// If we don't have a cache, or we should ignore cache
	if (!actor || noCache) {
		const remoteActor = await resolveAPObject(actorId);

		if (!APObjectIsActor(remoteActor))
			throw new APError("Request was signed by a non-actor object?");

		if (!remoteActor.publicKey?.publicKeyPem)
			throw new APError(
				"Public key of signing actor was not returned when requested",
			);

		switch (remoteActor.type) {
			case "Group":
				actor = await createChannelFromRemoteGroup(remoteActor);
				if (channel) actor.id = channel.id;
				break;
			case "Organization":
				actor = await createGuildFromRemoteOrg(remoteActor);
				if (guild) actor.id = guild.id;
				break;
			default:
				// treat as person
				actor = await createUserForRemotePerson(remoteActor);
				if (user) actor.id = user.id;
		}

		await actor.save();
	}

	if (activity) {
		// verify that the one who signed this activity was the one authoring it
		let author = activity.actor ?? activity.attributedTo;
		author = Array.isArray(author) ? author[0] : author;
		if (typeof author !== "string")
			throw new APError(
				"Could not verify author was the one who signed this activity",
			);
		if (actor.remote_address !== author)
			throw new APError(
				`Author of activity ${activity.id} did not match signing author ${actor.remote_address}`,
			);

		if (!activity.id) throw new APError("Activity does not have ID");

		// verify that key id has same origin as activity id
		if (new URL(keyId).origin !== new URL(activity.id).origin)
			throw new APError("Key ID does not match activity ID");
	}

	if (rawActivity || requestHeaders.digest) {
		if (!rawActivity || !requestHeaders.digest)
			throw new APError(
				"If message provided, digest must be too and vice versa",
			);

		const request = requestHeaders.digest;
		if (typeof request !== "string")
			throw new APError("Digest header is not string?");
		const [algo, inDigest] = request.split("=");

		// TODO: support different digest algos
		if (algo.toLowerCase() !== "sha-256")
			throw new APError("Only sha-256 supported for message digests");

		const digest = crypto
			.createHash("sha256")
			.update(rawActivity)
			.digest("base64");

		// TODO: verify.funfedi.dev sends digests without b64 padding???
		// but I don't know if other software does this
		// so I have to test both...

		const withoutPadding =
			digest.charAt(digest.length - 1) === "=" // if it has padding
				? digest.slice(0, digest.lastIndexOf("=")) // remove it
				: digest; // otherwise we're good

		if (inDigest !== digest && inDigest !== withoutPadding)
			throw new APError(
				"b64 sha256 digest of message does not match provided digest header",
			);
	}

	const expected = getSignString(
		target,
		method,
		requestHeaders,
		headers.split(/\s+/),
	);

	const verifier = crypto.createVerify(
		algorithm?.toUpperCase() || ALLOWED_ALGOS[0],
	);
	verifier.write(expected);
	verifier.end();

	const result = verifier.verify(
		actor.public_key,
		Buffer.from(signature, "base64"),
	);

	// If the actor was cached and the result fails, retry without cache
	// if we've already tried without cache, ignore
	if (!result && actorWasCached && !noCache) {
		Log.warn(
			`Could not verify http signature with cached actor (${actor.remote_address}) public key. Retrying without cache`,
		);

		return await validateHttpSignature(
			target,
			method,
			requestHeaders,
			rawActivity,
			true,
		);
	}

	if (!result) {
		throw new APError("HTTP Signature could not be validated", 401);
	}

	return actor;
};

/**
 * Returns a signed request that can be passed to fetch
 * ```
 * const signed = await signActivity(receiver.inbox, sender, activity);
 * await fetch(receiver.inbox, signed);
 * ```
 */
export const signWithHttpSignature = (
	target: string,
	method: string,
	keys: Actor,
	message?: string,
) => {
	if (!keys.private_key)
		throw new APError("Cannot sign activity without private key");

	const digest = message
		? crypto.createHash("sha256").update(message).digest("base64")
		: undefined;
	const signer = crypto.createSign("sha256");
	const now = new Date();

	const url = new URL(target);
	const requestTarget = url.pathname + url.search;

	const headers: { [key: string]: string } = {
		host: url.hostname,
		date: now.toUTCString(),
	};

	if (digest) {
		headers.digest = `digest: SHA-256=${digest}`;
	}

	const names = [...Object.keys(headers), "(request-target)"];

	const toSign = getSignString(requestTarget, method, headers, names);

	signer.update(toSign);
	signer.end();

	const signature = signer.sign(keys.private_key);
	const sig_b64 = signature.toString("base64");

	const header =
		`keyId="${makeInstanceUrl(getExternalPathFromActor(keys))}",` +
		`headers="${names.join(" ")},` +
		`signature="${sig_b64}"`;

	const ret = {
		method,
		headers: {
			...ACTIVITYPUB_FETCH_OPTS.headers,
			host: url.hostname,
			date: now.toUTCString(),
			digest: digest ? `SHA-256=${digest}` : undefined,
			signature: header,
		},
		body: message,
	};

	// biome-ignore lint/performance/noDelete: <explanation>
	if (!ret.headers.digest) delete ret.headers.digest;

	return ret as RequestInit;
};
