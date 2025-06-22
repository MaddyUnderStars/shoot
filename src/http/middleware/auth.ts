import type { RequestHandler } from "express";
import type { Actor } from "../../entity/actor";
import type { User } from "../../entity/user";
import { ACTIVITY_JSON_ACCEPT } from "../../util/activitypub/constants";
import { HttpError } from "../../util/httperror";
import { getUserFromToken } from "../../util/token";

export const NO_AUTH_ROUTES = [
	"/auth/login",
	"/auth/register",
	/\.well\-known/,
	"/nodeinfo/2.0.json",

	// TODO: this might not be a good idea?
	/channel\/.*?\/attachments\/.+$/,

	// TODO: there are here because lemmy keeps requesting them
	// and it throws a huge stack trace in my terminal
	"/api/v3/site",
	"/api/v3/federated_instances",
];

export const authHandler: RequestHandler = async (req, res, next) => {
	const url = req.url;

	if (
		NO_AUTH_ROUTES.some((x) => {
			if (typeof x === "string") return url.startsWith(x);
			return x.test(url);
		}) ||
		ACTIVITY_JSON_ACCEPT.some((v) => req.headers.accept?.includes(v)) ||
		ACTIVITY_JSON_ACCEPT.some((v) =>
			req.headers["content-type"]?.includes(v),
		)
	)
		return next();

	const { authorization } = req.headers;
	if (!authorization)
		return next(new HttpError("Missing `authorization` header", 401));

	let user: User;
	try {
		user = await getUserFromToken(authorization);
	} catch (e) {
		return next(e);
	}

	req.user = user;

	return next();
};

declare global {
	namespace Express {
		interface Request {
			/** For local authenticated routes (using a token), contains the User object associated with the token */
			user: User;
			/** For s2s/federated routes (using http signatures), contains the Actor that signed this request */
			actor: Actor;
		}
	}
}
