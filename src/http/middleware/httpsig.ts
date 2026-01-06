import bodyParser from "body-parser";
import type { RequestHandler } from "express";
import { ACTIVITY_JSON_ACCEPT } from "../../util/activitypub/constants";
import { validateHttpSignature } from "../../util/activitypub/httpsig";
import { config } from "../../util/config";
import { createLogger } from "../../util/log";
import { makeInstanceUrl } from "../../util/url";

const Log = createLogger("httpsignatures");

export const verifyHttpSig: RequestHandler = async (req, res, next) => {
	if (req.originalUrl === "/actor" && req.method === "GET") {
		return next(); // allow GET /actor unsigned
	}

	if (
		!req.headers.signature &&
		!config().federation.require_http_signatures
	) {
		/**
		 * This request hasn't been signed and we don't require sigs for every req
		 *
		 * NOTE: If a route requires a http sig (e.g. sending a friend req), it will try to access req.actor,
		 * which will be undefined if the signature isn't provided.
		 */

		return next();
	}

	// we want to only run bodyParser.raw if the request actually needs to be verified
	// otherwise, it'll get bodyParser.json further down

	const parser = bodyParser.raw({
		type: ACTIVITY_JSON_ACCEPT,
		inflate: true,
	});

	await new Promise<void>((resolve, reject) => {
		parser(req, res, (err) => {
			if (err) {
				return reject(err);
			}

			resolve();
		});
	});

	// we have req.body now.
	// later in the request stack, JSON.parse or the normal bodyParser.json will be run
	// depending on if req.body exists

	try {
		req.actor = await validateHttpSignature(
			new URL(makeInstanceUrl(req.originalUrl)).pathname,
			req.method,
			req.headers,
			req.body,
			// Object.values(req.body ?? {}).length > 0 ? req.body : undefined,
		);
	} catch (e) {
		Log.verbose(
			`${req.originalUrl} : ${e instanceof Error ? e.message : e}`,
		);
		return next(e);
	}

	return next();
};
