import { Member, User } from "../../entity";
import { splitQualifiedMention } from "../activitypub";
import { HttpError } from "../httperror";
import { getOrFetchUser } from "./user";

export const getOrFetchMember = async (lookup: string) => {
	const mention = splitQualifiedMention(lookup);

	let member = await Member.findOne({
		where: {
			user: {
				name: mention.user,
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
		throw new HttpError("Missing permission", 400);
};

export const isMemberOfGuild = async (guild_id: string, user: User) => {
	const guild = splitQualifiedMention(guild_id);

	return (
		(await Member.count({
			where: {
				roles: {
					guild: [
						{ remote_address: guild_id },
						{ id: guild.user, domain: guild.domain },
					],
				},
				user: { id: user.id },
			},
		})) != 0
	);
};
