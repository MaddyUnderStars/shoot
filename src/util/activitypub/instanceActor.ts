import type { User } from "../../entity/user";
import { config } from "../config";
import { makeInstanceUrl } from "../url";

export const InstanceActor = Object.freeze({
	id: "actor",
	display_name: config.federation.webapp_url.hostname,
	name: config.federation.webapp_url.hostname,
	domain: config.federation.webapp_url.hostname,
	public_key: config.federation.public_key,
	private_key: config.federation.private_key,
	collections: {
		followers: makeInstanceUrl("/actor/followers"),
		following: makeInstanceUrl("/actor/following"),
		inbox: makeInstanceUrl("/actor/inbox"),
		outbox: makeInstanceUrl("/actor/outbox"),
	},
	created_date: new Date(),
}) as User;
