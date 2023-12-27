import type { User } from "../../entity";
import { config } from "../config";

export const InstanceActor = Object.freeze({
	id: "actor",
	display_name: config.federation.webapp_url.hostname,
	username: config.federation.instance_url.hostname,
	domain: config.federation.webapp_url.hostname,
	public_key: config.federation.public_key,
	private_key: config.federation.private_key,
	collections: {
		followers: `${config.federation.instance_url.origin}/actor/followers`,
		following: `${config.federation.instance_url.origin}/actor/following`,
		inbox: `${config.federation.instance_url.origin}/actor/inbox`,
		outbox: `${config.federation.instance_url.origin}/actor/outbox`,
	},
}) as User;
