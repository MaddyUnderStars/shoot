import { RequestHandler } from "express";
import { APError, createLogger } from "../../util";
import { HttpSig } from "../../util/activitypub/httpsig";

const Log = createLogger("httpsignatures");

export const verifyHttpSig: RequestHandler = async (req, res, next) => {
	if (!req.headers["signature"]) {
		// not a signed request

		// TODO: does this endpoint require signing?

		Log.verbose(`Unsigned request to ${req.originalUrl} was allowed`);

		return next();
	}

	try {
		if (!(await HttpSig.validate(req.originalUrl, req.method, req.headers)))
			return next(new APError("HTTP Signature could not be validated."));
	} catch (e) {
		Log.error(e);
		return next(e);
	}

	return next();
};
