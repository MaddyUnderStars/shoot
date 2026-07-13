import { DataSource } from "typeorm";

import { ApCache } from "../entity/apcache.js";
import { Attachment } from "../entity/attachment.js";
import { Channel } from "../entity/channel.js";
import { DMChannel } from "../entity/DMChannel.js";
import { Embed } from "../entity/embed.js";
import { Guild } from "../entity/guild.js";
import { InstanceInvite } from "../entity/instanceInvite.js";
import { Invite } from "../entity/invite.js";
import { Member } from "../entity/member.js";
import { Message } from "../entity/message.js";
import { Migration } from "../entity/migrations.js";
import { PushSubscription } from "../entity/pushSubscription.js";
import { Relationship } from "../entity/relationship.js";
import { Role } from "../entity/role.js";
import { Session } from "../entity/session.js";
import { GuildTextChannel } from "../entity/textChannel.js";
import { LocalUpload } from "../entity/upload.js";
import { User } from "../entity/user.js";
import { VoiceState } from "../entity/voiceState.js";
import { config } from "./config.js";
import { LocalUpload1749945089530 } from "./migration/postgres/1749945089530-local_upload.js";
import { ChannelOrdering1750057984384 } from "./migration/postgres/1750057984384-channelOrdering.js";
import { RegisterInvites1751438079643 } from "./migration/postgres/1751438079643-register-invites.js";
import { Embeds1757219628590 } from "./migration/postgres/1757219628590-embeds.js";
import { UploadsCascade1757588526875 } from "./migration/postgres/1757588526875-uploadsCascade.js";
import { InviteIndex1757745204938 } from "./migration/postgres/1757745204938-inviteIndex.js";
import { PushSubscription1758865221251 } from "./migration/postgres/1758865221251-pushSubscription.js";
import { MessageNonce1771113785560 } from "./migration/postgres/1771113785560-messageNonce.js";
import { VoiceState1778143207892 } from "./migration/postgres/1778143207892-voiceState.js";
import { ProfileImages1778755429041 } from "./migration/postgres/1778755429041-profileImages.js";
import { EmbedThumbnails1779430645216 } from "./migration/postgres/1779430645216-embedThumbnails.js";
import { Jsonb1779431257338 } from "./migration/postgres/1779431257338-jsonb.js";
import { AutojoinGuilds1783139862203 } from "./migration/postgres/1783139862203-autojoinGuilds.js";

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
			VoiceState,
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
			VoiceState1778143207892,
			ProfileImages1778755429041,
			EmbedThumbnails1779430645216,
			Jsonb1779431257338,
			AutojoinGuilds1783139862203,
		],
	});

	return datasource;
};
