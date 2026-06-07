import { APObject, APOrganization as APOrgOriginal } from "activitypub-types";

export interface APOrganization extends APOrgOriginal {
	/**
	 * The `context` of GuildTextChannels (Groups) in a Guild
	 * An OrderedCollection of the channels in the guild
	 */
	channels: string;
}

export const ObjectIsOrganization = (obj: APObject): obj is APOrganization => {
	return obj.type === "Organization";
};
