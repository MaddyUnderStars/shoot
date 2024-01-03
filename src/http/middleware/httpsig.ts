import { RequestHandler } from "express";
import { APError, HttpSig, config, createLogger } from "../../util";

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
		// i.e. sending to an inbox, getting a user's followers/following/posts etc

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
