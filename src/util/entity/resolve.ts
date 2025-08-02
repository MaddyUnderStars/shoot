import { validate as uuidValidate } from "uuid";
import { Channel } from "../../entity/channel";
import { Guild } from "../../entity/guild";
import { User } from "../../entity/user";
import { InstanceActor } from "../activitypub/instanceActor";

export const findActorOfAnyType = async (id: string, domain: string) => {
	if (id === InstanceActor.id && domain === InstanceActor.domain)
		return InstanceActor;

	const isUuid = uuidValidate(id);

	const [user, channel, guild] = await Promise.all([
		isUuid
			? null
			: User.findOne({
					where: [
						{
							name: id,
							domain: domain,
						},
					],
				}),
		isUuid
			? Channel.findOne({
					where: [
						{
							id,
							domain,
						},
						{
							remote_id: id,
							domain,
						},
					],
				})
			: null,

		isUuid
			? Guild.findOne({
					where: [
						{
							id,
							domain,
						},
						{
							remote_id: id,
							domain,
						},
					],
				})
			: null,
	]);

	return user ?? channel ?? guild;
};
