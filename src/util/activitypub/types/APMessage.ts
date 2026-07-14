import { APObject, isObjectField, ObjectField } from "@shootpub/activitypub-types/object";

export type APMessage = APObject & {
	attributedTo: ObjectField;
};

export const isChatMessage = (obj: APObject): obj is APMessage => {
	return "attributedTo" in obj && isObjectField(obj.attributedTo);
};
