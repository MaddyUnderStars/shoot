import { config } from "../config";

export class InstanceBlockedError extends Error {
	name = "InstanceBlockedError";
}

/**
 * Throw if instance is marked as blocked via config
 */
export const throwInstanceBlock = (instance: URL) => {
	if (
		config.federation.instances[instance.hostname] ===
			InstanceBehaviour.BLOCK ||
		(config.federation.allowlist &&
			config.federation.instances[instance.hostname] ===
				InstanceBehaviour.ALLOW)
	)
		// this is caught by our error handler and times the connection out
		throw new InstanceBlockedError();
};

/** Return whether or not this instance is limited */
export const instanceIsLimited = (instance: URL) => {
	return (
		config.federation.instances[instance.hostname] ===
		InstanceBehaviour.LIMIT
	);
};

// TODO: when an instance is blocked, should content that includes the blocked content be allowed?
// e.g. someone boosts a post from a blocked instance, should I see the boost?
// export const shouldAllowActivity = async (
// 	instance: URL,
// 	activity: APActivity,
// ) => {
// 	throwInstanceBlock(instance);
// 	if (!activity.id) throw new APError("Activity must have ID");
// 	throwInstanceBlock(new URL(activity.id));

// 	const checkBlock = (key: keyof APActivity) => {
// 		if (!(key in activity && activity[key])) return true;

// 		let id: string;
// 		if (typeof activity[key] === "string") id = activity[key];
// 		else if ("id" in activity[key] && typeof activity[key].id === "string")
// 			id = activity[key].id;
// 		else return true;

// 		throwInstanceBlock(new URL(id));
// 	};

//     checkBlock("object");
//     checkBlock("actor");
//     checkBlock("")
// };

export enum InstanceBehaviour {
	/** allow all content */
	ALLOW = "allow",

	/**
	 * only allow content if the remote user has a relationship with a local user
	 * force remote users to be approved by guild before joining (force-knockjoin)
	 *
	 * e.g. a limited remote user can only send us dms if we are friends.
	 * they can send a friend request only if we share a guild.
	 * they can only join a guild by being accepted by a user in the guild with permission (knocking)
	 */
	LIMIT = "limit",

	/**
	 * block all content from this instance,
	 * and block this instance from getting our (http sig required) content
	 */
	BLOCK = "block",
}
