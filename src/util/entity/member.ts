import type { APPerson } from "activitypub-types";
import { Member } from "../../entity/member";
import type { User } from "../../entity/user";
import type { ActorMention } from "../activitypub/constants";
import { resolveId } from "../activitypub/resolve";
import { splitQualifiedMention } from "../activitypub/util";
import { HttpError } from "../httperror";
import { getOrFetchUser } from "./user";

export const getOrFetchMember = async (
	lookup: ActorMention | URL | APPerson,
) => {
	const mention = splitQualifiedMention(resolveId(lookup));

	const member = await Member.findOne({
		where: {
			user: {
				name: mention.id,
				domain: mention.domain,
			},
		},
	});

	if (!member) {
		const user = await getOrFetchUser(lookup);
		await user.save();
		return Member.create({
			user,
			roles: [], // assigned later
		});
	}

	return member;
};

export const isMemberOfGuildThrow = async (guild_id: string, user: User) => {
	if (!(await isMemberOfGuild(guild_id, user)))
		throw new HttpError("Missing permission", 404);
};

export const isMemberOfGuild = async (guild_id: string, user: User) => {
	const guild = splitQualifiedMention(guild_id);

	return (
		(await Member.count({
			where: {
				roles: {
					guild: [
						{ remote_address: guild_id },
						{ id: guild.id, domain: guild.domain },
					],
				},
				user: { id: user.id },
			},
		})) !== 0
	);
};
