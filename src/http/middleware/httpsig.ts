import type { RequestHandler } from "express";
import { config, createLogger, validateHttpSignature } from "../../util";

const Log = createLogger("httpsignatures");

export const verifyHttpSig: RequestHandler = async (req, res, next) => {
	if (req.originalUrl === "/actor" && req.method === "GET") {
		return next(); // allow GET /actor unsigned
	}

	if (!req.headers.signature && !config.federation.require_http_signatures) {
		// not a signed request

		// TODO: does this endpoint require signing?
		// i.e. sending to an inbox, getting a user's followers/following/posts etc

		return next();
	}

	try {
		req.actor = await validateHttpSignature(
			req.originalUrl,
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
