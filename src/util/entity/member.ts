import { Member } from "../../entity";
import { splitQualifiedMention } from "../activitypub";
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
