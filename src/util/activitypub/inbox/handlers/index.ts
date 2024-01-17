import { APActivity } from "activitypub-types";
import { Actor } from "../../../../entity";
import { CreateActivityHandler } from "./create";
import { FollowActivityHandler } from "./follow";

export type ActivityHandler = (
	activity: APActivity,
	target: Actor,
) => Promise<unknown>;

export const ActivityHandlers: { [key: Lowercase<string>]: ActivityHandler } = {
	create: CreateActivityHandler,
	follow: FollowActivityHandler,
};
