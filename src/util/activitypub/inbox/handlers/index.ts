import { APActivity } from "@shootpub/activitypub-types/activity";
import type { Actor } from "../../../../entity/actor.js";
import { AcceptActivityHandler } from "./accept.js";
import { AnnounceActivityHandler } from "./announce.js";
import { CreateActivityHandler } from "./create.js";
import { FollowActivityHandler } from "./follow.js";
import { JoinActivityHandler } from "./join.js";
import { LikeActivityHandler } from "./like.js";
import { UndoActivityHandler } from "./undo.js";

export type ActivityHandler = (activity: APActivity, target: Actor) => Promise<unknown>;

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
