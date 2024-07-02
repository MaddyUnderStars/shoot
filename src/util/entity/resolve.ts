import { Channel, Guild, User } from "../../entity";
import { InstanceActor } from "../activitypub";

const uuid =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const findActorOfAnyType = async (id: string, domain: string) => {
	if (id === InstanceActor.id && domain === InstanceActor.domain)
		return InstanceActor;

	// todo: awful
	const [user, channel, guild] = await Promise.all([
		uuid.test(id)
			? null
			: User.findOne({
					where: [
						{
							name: id,
							domain: domain,
						},
						{
							remote_id: id,
							domain,
						},
					],
				}),
		uuid.test(id)
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

		uuid.test(id)
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
