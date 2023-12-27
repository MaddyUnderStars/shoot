import { APActivity } from "activitypub-types";
import crypto from "crypto";
import { IncomingHttpHeaders } from "http";
import { ACTIVITYPUB_FETCH_OPTS, APError, createUserForRemotePerson } from ".";
import { Actor, User } from "../../entity";
import { config } from "../config";

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

		if (
			// Older than 1 day
			Date.parse(date).valueOf() >
			Date.now() + 24 * 60 * 60 * 1000
		)
			throw new APError("Signature too old");

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
		const remoteUser =
			(await User.findOne({ where: { remote_address: actorId } })) ??
			(await (await createUserForRemotePerson(actorId)).save());

		// verify that the one who signed this activity was the one authoring it
		if (activity) {
			let author = activity.actor ?? activity.attributedTo;
			author = Array.isArray(author) ? author[0] : author;
			if (typeof author != "string")
				throw new APError(
					"Could not verify author was the one who signed this activity",
				);
			if (remoteUser.remote_address != author)
				throw new APError(
					`Author of activity ${activity.id} did not match signing author ${remoteUser.remote_address}`,
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
			remoteUser.public_key,
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
