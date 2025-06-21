import type { APActivity } from "activitypub-types";
import type { Actor } from "../../../../entity";
import { AcceptActivityHandler } from "./accept";
import { AnnounceActivityHandler } from "./announce";
import { CreateActivityHandler } from "./create";
import { FollowActivityHandler } from "./follow";
import { JoinActivityHandler } from "./join";
import { UndoActivityHandler } from "./undo";
import { LikeActivityHandler } from "./like";

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

	// this one is only to pass verify.funfedi.dev
	like: LikeActivityHandler,
	// EchoRequest will not be implemented as the activity doesn't have an
	// ID, which means I'd have to change some of the validation logic just for a
	// test site. no
};
