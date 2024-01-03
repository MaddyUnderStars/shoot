import { APActivity } from "activitypub-types";
import crypto from "crypto";
import { IncomingHttpHeaders } from "http";
import { Actor, Channel, User } from "../../entity";
import { config } from "../config";
import { createChannelFromRemoteGroup } from "../entity/channel";
import { createUserForRemotePerson } from "../entity/user";
import { ACTIVITYPUB_FETCH_OPTS } from "./constants";
import { APError } from "./error";
import { resolveAPObject } from "./resolve";
import { APObjectIsActor, hasAPContext } from "./util";

export class HttpSig {
	private static getSignString<T extends IncomingHttpHeaders>(
		target: string,
		method: string,
		headers: T,
		names: string[],
	) {
		const requestTarget = `${method.toLowerCase()} ${target}`;
		headers = {
			...headers,
			"(request-target)": requestTarget,
		};

		return names
			.map((header) => `${header.toLowerCase()}: ${headers[header]}`)
			.join("\n");
	}

	// TODO: Support hs2019 algo
	public static async validate(
		target: string,
		method: string,
		requestHeaders: IncomingHttpHeaders,
		activity?: APActivity,
	) {
		const date = requestHeaders["date"];
		const sigheader = requestHeaders["signature"]?.toString();

		if (!date || !sigheader) throw new APError("Missing signature");

		const ONE_DAY = 24 * 60 * 60 * 1000;
		const dateParsed = Date.parse(date).valueOf();
		if (dateParsed > Date.now() + ONE_DAY || dateParsed < Date.now() - ONE_DAY)
			throw new APError("Signature was created gt/lt 1 day from now");

		const sigopts: { [key: string]: string | undefined } = Object.assign(
			{},
			...sigheader
				.split(",")
				.flat()
				.map((keyval) => {
					const split = keyval.split("=");
					return {
						[split[0]]: split[1].replaceAll('"', ""),
					};
				}),
		);

		const { signature, headers, keyId, algorithm } = sigopts;

		if (!signature || !headers || !keyId)
			throw new APError("Invalid signature");

		const ALLOWED_ALGO = "rsa-sha256";

		// If it's provided, check it. otherwise just assume it's sha256
		if (algorithm && algorithm != ALLOWED_ALGO)
			throw new APError(`Unsupported encryption algorithm ${algorithm}`);

		const url = new URL(keyId);
		const actorId = `${url.origin}${url.pathname}`; // likely wrong

		// TODO: this breaks channel federation
		// since channels don't have usernames
		// maybe it would be better to have an `RemoteActors` table and store
		// keys in there? it would simplify this greatly
		// const remoteUser =
		// 	(await User.findOne({ where: { remote_address: actorId } })) ??
		// 	(await (await createUserForRemotePerson(actorId)).save());

		const [user, channel] = await Promise.all([
			User.findOne({ where: { remote_address: actorId } }),
			Channel.findOne({ where: { remote_address: actorId } }),
		]);

		let actor = user ?? channel;

		if (!actor) {
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
					break;
				default:
					// treat as person
					actor = await createUserForRemotePerson(remoteActor);
			}

			await actor.save();
		}

		// verify that the one who signed this activity was the one authoring it
		if (activity && hasAPContext(activity)) {
			let author = activity.actor ?? activity.attributedTo;
			author = Array.isArray(author) ? author[0] : author;
			if (typeof author != "string")
				throw new APError(
					"Could not verify author was the one who signed this activity",
				);
			if (actor.remote_address != author)
				throw new APError(
					`Author of activity ${activity.id} did not match signing author ${actor.remote_address}`,
				);
		}

		const expected = this.getSignString(
			target,
			method,
			requestHeaders,
			headers.split(/\s+/),
		);

		const verifier = crypto.createVerify(
			algorithm?.toUpperCase() || ALLOWED_ALGO,
		);
		verifier.write(expected);
		verifier.end();

		return verifier.verify(
			actor.public_key,
			Buffer.from(signature, "base64"),
		);
	}

	/**
	 * Returns a signed request that can be passed to fetch
	 * ```
	 * const signed = await signActivity(receiver.inbox, sender, activity);
	 * await fetch(receiver.inbox, signed);
	 * ```
	 */
	public static sign(
		target: string,
		method: string,
		keys: Actor,
		id: string,
		message?: APActivity,
	) {
		if (!keys.private_key)
			throw new APError("Cannot sign activity without private key");

		const digest = message
			? crypto
					.createHash("sha256")
					.update(JSON.stringify(message))
					.digest("base64")
			: undefined;
		const signer = crypto.createSign("sha256");
		const now = new Date();

		const url = new URL(target);
		const inboxFrag = url.pathname;
		const toSign =
			`(request-target): ${method.toLowerCase()} ${inboxFrag}` +
			`\nhost: ${url.hostname}` +
			`\ndate: ${now.toUTCString()}` +
			(digest ? `\ndigest: SHA-256=${digest}` : "");

		signer.update(toSign);
		signer.end();

		const signature = signer.sign(keys.private_key);
		const sig_b64 = signature.toString("base64");

		// const id =
		// 	keys.id == InstanceActor.id
		// 		? `/actor`
		// 		: `/users/${keys.username}`;

		const header =
			`keyId="${config.federation.instance_url.origin}${id}",` +
			`headers="(request-target) host date${digest ? " digest" : ""}",` +
			`signature="${sig_b64}"`;

		return {
			method,
			headers: {
				...ACTIVITYPUB_FETCH_OPTS.headers,
				Host: url.hostname,
				Date: now.toUTCString(),
				Digest: digest ? `SHA-256=${digest}` : undefined,
				Signature: header,
			},
			body: message ? JSON.stringify(message) : undefined,
		} as RequestInit;
	}
}
