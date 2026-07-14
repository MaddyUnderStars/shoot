import { APActor as ActorOriginal } from "@shootpub/activitypub-types/actor";
import { APOrganization } from "./APOrganisation.js";

export type APActor = ActorOriginal | APOrganization;
