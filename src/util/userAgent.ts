import { config } from "./config.js";

export const USER_AGENT = `Shoot (https://github.com/maddyunderstars/shoot; +${config().federation.webapp_url.origin})`;

export const ACTIVITYPUB_FETCH_OPTS: RequestInit = {
	headers: {
		Accept: "application/activity+json",
		"Content-Type": "application/activity+json",
		"User-Agent": USER_AGENT,
	},

	redirect: "follow",
};
