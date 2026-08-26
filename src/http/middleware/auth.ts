import type { RequestHandler } from "express";
import type { Actor } from "../../entity/actor.js";
import type { User } from "../../entity/user.js";
import { ACTIVITY_JSON_ACCEPT } from "../../util/activitypub/constants.js";
import { Oauth } from "../../util/oauth.js";
import { Request as OAuthRequest, Response as OauthResponse } from "@node-oauth/oauth2-server";

export const NO_AUTH_ROUTES = [
	"/auth/login",
	"/auth/register",
	/\.well-known/,
	"/nodeinfo/2.0.json",

	// TODO: this might not be a good idea?
	/channel\/.*?\/attachments\/.+$/,
	/users\/.*?\/attachments\/.+$/,

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
		ACTIVITY_JSON_ACCEPT.some((v) => req.headers["content-type"]?.includes(v))
	)
		return next();

	try {
		const auth = await Oauth.server.authenticate(new OAuthRequest(req), new OauthResponse(res));

		req.user = auth.user as User;
		req.scopes = auth.scope;
	} catch (e) {
		return next(e);
	}

	return next();
};

declare global {
	namespace Express {
		interface Request {
			/** For local authenticated routes (using a token), contains the User object associated with the token */
			user: User;
			/** For s2s/federated routes (using http signatures), contains the Actor that signed this request */
			actor: Actor;
			/** Granted oauth scopes */
			scopes: string[] | undefined;
		}
	}
}
