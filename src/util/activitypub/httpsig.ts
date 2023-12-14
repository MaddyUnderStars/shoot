import { APActivity } from "activitypub-types";
import crypto from "crypto";
import { IncomingHttpHeaders } from "http";
import { ACTIVITYPUB_FETCH_OPTS, APError, createUserForRemotePerson } from ".";
import { User } from "../../entity";
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
		activity: APActivity,
		requestHeaders: IncomingHttpHeaders,
	) {
		const date = requestHeaders["date"];
		if (
			!date ||
			// Older than 1 day
			Date.parse(date).valueOf() > Date.now() + 24 * 60 * 60 * 1000
		)
			throw new APError("Signature too old");

		const sigheader = requestHeaders["signature"]?.toString();
		if (!sigheader) throw new APError("Missing signature");
		const sigopts: { [key: string]: string | undefined } = Object.assign(
			{},
			...sigheader.split(",").flat().map((keyval) => {
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

		const remoteUser = await createUserForRemotePerson(actorId);

		const expected = this.getSignString(
			target,
			"post",
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
		inbox: string,
		sender: User,
		message: APActivity,
	) {
		if (!sender.private_key)
			throw new APError("Cannot sign activity without private key");

		const digest = crypto
			.createHash("sha256")
			.update(JSON.stringify(message))
			.digest("base64");
		const signer = crypto.createSign("sha256");
		const now = new Date();

		const url = new URL(inbox);
		const inboxFrag = url.pathname;
		const toSign =
			`(request-target): post ${inboxFrag}\n` +
			`host: ${url.hostname}\n` +
			`date: ${now.toUTCString()}\n` +
			`digest: SHA-256=${digest}`;

		signer.update(toSign);
		signer.end();

		const signature = signer.sign(sender.private_key);
		const sig_b64 = signature.toString("base64");

		const header =
			`keyId="${config.federation.webapp_url.origin}/users/${sender.username}@${sender.domain}#public-key",` +
			`headers="(request-target) host date digest",` +
			`signature="${sig_b64}"`;

		return {
			headers: {
				...ACTIVITYPUB_FETCH_OPTS.headers,
				Host: url.hostname,
				Date: now.toUTCString(),
				Digest: `SHA-256=${digest}`,
				Signature: header,
			},
			method: "POST",
			body: JSON.stringify(message),
		} as RequestInit;
	}
}