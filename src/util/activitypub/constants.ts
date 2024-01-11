
export const ACTIVITYSTREAMS_CONTEXT = "https://www.w3.org/ns/activitystreams";

export const ACTIVITY_JSON_ACCEPT = [
	'application/ld+json; profile="https://www.w3.org/ns/activitystreams"',
	"application/activity+json",
];

export const USER_AGENT =
	"Unnamed Activitypub Chat Server (https://github.com/maddyunderstars)";

export const ACTIVITYPUB_FETCH_OPTS: RequestInit = {
	headers: {
		Accept: "application/activity+json",
		"Content-Type": "application/activity+json",
		"User-Agent": USER_AGENT,
	},

	redirect: "follow",
};

export type ActorMention = `${string}@${string}`;