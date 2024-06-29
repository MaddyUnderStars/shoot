import { APActivity } from "activitypub-types";
import { Actor } from "../../../../entity";
import { AcceptActivityHandler } from "./accept";
import { AnnounceActivityHandler } from "./announce";
import { CreateActivityHandler } from "./create";
import { FollowActivityHandler } from "./follow";
import { JoinActivityHandler } from "./join";
import { UndoActivityHandler } from "./undo";

export type ActivityHandler = (
	activity: APActivity,
	target: Actor,
) => Promise<unknown>;

export const ActivityHandlers: { [key: Lowercase<string>]: ActivityHandler } = {
	create: CreateActivityHandler,
	announce: AnnounceActivityHandler,
	follow: FollowActivityHandler,
	undo: UndoActivityHandler,
	accept: AcceptActivityHandler,
	join: JoinActivityHandler,
};
