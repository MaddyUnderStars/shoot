import path from "node:path";
import { DataSource } from "typeorm";

import { ApCache } from "../entity/apcache";
import { Attachment } from "../entity/attachment";
import { Channel } from "../entity/channel";
import { DMChannel } from "../entity/DMChannel";
import { Embed } from "../entity/embed";
import { Guild } from "../entity/guild";
import { InstanceInvite } from "../entity/instanceInvite";
import { Invite } from "../entity/invite";
import { Member } from "../entity/member";
import { Message } from "../entity/message";
import { Migration } from "../entity/migrations";
import { PushSubscription } from "../entity/pushSubscription";
import { Relationship } from "../entity/relationship";
import { Role } from "../entity/role";
import { Session } from "../entity/session";
import { GuildTextChannel } from "../entity/textChannel";
import { LocalUpload } from "../entity/upload";
import { User } from "../entity/user";
import { config } from "./config";
import { LocalUpload1749945089530 } from "./migration/postgres/1749945089530-local_upload";
import { ChannelOrdering1750057984384 } from "./migration/postgres/1750057984384-channelOrdering";
import { RegisterInvites1751438079643 } from "./migration/postgres/1751438079643-register-invites";
import { Embeds1757219628590 } from "./migration/postgres/1757219628590-embeds";
import { UploadsCascade1757588526875 } from "./migration/postgres/1757588526875-uploadsCascade";
import { InviteIndex1757745204938 } from "./migration/postgres/1757745204938-inviteIndex";
import { PushSubscription1758865221251 } from "./migration/postgres/1758865221251-pushSubscription";
import { MessageNonce1771113785560 } from "./migration/postgres/1771113785560-messageNonce";

let datasource: DataSource;

export const getDatasource = () => {
	if (datasource) return datasource;

	const CONNECTION_STRING = config().database.url;
	const CONNECTION_TYPE = CONNECTION_STRING.replace(
		// standardise so our migrations folder works
		"postgresql://",
		"postgres://",
	)
		.split("://")?.[0]
		?.replace("+src", "");
	const IS_SQLITE = CONNECTION_TYPE === "sqlite";

	datasource = new DataSource({
		//@ts-expect-error
		type: CONNECTION_TYPE,
		url: IS_SQLITE ? undefined : CONNECTION_STRING,
		database: IS_SQLITE ? CONNECTION_STRING.split("://")[1] : undefined,
		supportBigNumbers: true,
		bigNumberStrings: false,
		synchronize: false, // TODO
		logging: config().database.log,

		// https://github.com/typeorm/typeorm/issues/11570
		// Using string paths here throws when running under Vitest

		entities: [
			// path.join(
			// 	__dirname,
			// 	"..",
			// 	"entity",
			// 	process.env.TEST ? "*.ts" : "*.js",
			// ),

			ApCache,
			Attachment,
			Channel,
			DMChannel,
			Embed,
			Guild,
			InstanceInvite,
			Invite,
			Member,
			Message,
			Migration,
			PushSubscription,
			Relationship,
			Role,
			Session,
			GuildTextChannel,
			LocalUpload,
			User,
		],

		migrations: [
			// path.join(
			// 	__dirname,
			// 	"migration",
			// 	CONNECTION_TYPE,
			// 	process.env.TEST ? "*.ts" : "*.js",
			// ),

			LocalUpload1749945089530,
			ChannelOrdering1750057984384,
			RegisterInvites1751438079643,
			Embeds1757219628590,
			UploadsCascade1757588526875,
			InviteIndex1757745204938,
			PushSubscription1758865221251,
			MessageNonce1771113785560,
		],
	});

	return datasource;
};
