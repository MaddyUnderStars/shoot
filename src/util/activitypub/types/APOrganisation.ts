import {
	isAPOrganization,
	type APOrganization as APOrgOrig,
} from "@shootpub/activitypub-types/actors/organization";
import { APObject, isObjectId, ObjectId } from "@shootpub/activitypub-types/object";

export interface APOrganization extends APOrgOrig {
	/**
	 * The `context` of GuildTextChannels (Groups) in a Guild
	 * An OrderedCollection of the channels in the guild
	 */
	channels: ObjectId;

	name: string;
}

export const ObjectIsOrganization = (obj: APObject): obj is APOrganization => {
	return (
		isAPOrganization(obj) &&
		"channels" in obj &&
		isObjectId(obj.channels) &&
		"name" in obj &&
		typeof obj.name === "string" &&
		!!obj.name
	);
};
