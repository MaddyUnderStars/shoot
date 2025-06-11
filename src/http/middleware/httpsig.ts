import type { RequestHandler } from "express";
import {
	config,
	createLogger,
	makeInstanceUrl,
	validateHttpSignature,
} from "../../util";

const Log = createLogger("httpsignatures");

export const verifyHttpSig: RequestHandler = async (req, res, next) => {
	if (req.originalUrl === "/actor" && req.method === "GET") {
		return next(); // allow GET /actor unsigned
	}

	if (!req.headers.signature && !config.federation.require_http_signatures) {
		/**
		 * This request hasn't been signed and we don't require sigs for every req
		 *
		 * NOTE: If a route requires a http sig (e.g. sending a friend req), it will try to access req.actor,
		 * which will be undefined if the signature isn't provided.
		 */

		return next();
	}

	try {
		req.actor = await validateHttpSignature(
			new URL(makeInstanceUrl(req.originalUrl)).pathname,
			req.method,
			req.headers,
			Object.values(req.body).length > 0 ? req.body : undefined,
		);
	} catch (e) {
		Log.verbose(
			`${req.originalUrl} : ${e instanceof Error ? e.message : e}`,
		);
		return next(e);
	}

	return next();
};
