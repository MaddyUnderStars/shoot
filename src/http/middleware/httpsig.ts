import { RequestHandler } from "express";
import { APError, config, createLogger } from "../../util";
import { HttpSig } from "../../util/activitypub/httpsig";

const Log = createLogger("httpsignatures");

export const verifyHttpSig: RequestHandler = async (req, res, next) => {
	if (req.originalUrl == "/actor" && req.method == "GET") {
		return next(); // allow GET /actor unsigned
	}

	if (
		!req.headers["signature"] &&
		!config.federation.require_http_signatures
	) {
		// not a signed request

		// TODO: does this endpoint require signing?

		Log.verbose(`Unsigned request to ${req.originalUrl} was allowed`);

		return next();
	}

	try {
		if (
			!(await HttpSig.validate(
				req.originalUrl,
				req.method,
				req.headers,
				Object.values(req.body).length > 0 ? req.body : undefined,
			))
		)
			return next(
				new APError("HTTP Signature could not be validated.", 401),
			);
	} catch (e) {
		Log.verbose(
			`${req.originalUrl} : ${e instanceof Error ? e.message : e}`,
		);
		return next(e);
	}

	return next();
};
