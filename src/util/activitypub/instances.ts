import { config } from "../config";
import { InstanceBehaviour } from "./instanceBehaviour";

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
