import {
	APActor as APActorOriginal,
	ObjectIsApplication,
	ObjectIsGroup,
	ObjectIsPerson,
	type AnyAPObject,
} from "activitypub-types";
import { APOrganization, ObjectIsOrganization } from "./APOrganisation.js";

export type APActor = APActorOriginal | APOrganization;

export const APObjectIsActor = (obj: AnyAPObject): obj is APActor => {
	return (
		ObjectIsPerson(obj) ||
		ObjectIsApplication(obj) ||
		ObjectIsGroup(obj) ||
		ObjectIsOrganization(obj)
	);
};
