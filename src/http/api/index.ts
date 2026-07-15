import bodyParser from "body-parser";
import { Router } from "express";
import { authHandler } from "../middleware/auth.js";
import { rateLimiter } from "../middleware/rate.js";

const router = Router();

// These are here instead of in ApiServer because otherwise we end up
// preventing bodyParser.raw from executing for http signature verification (#35 and #50)
router.use(bodyParser.json({ inflate: true }));
router.use(bodyParser.urlencoded({ inflate: true, extended: true }));

// BEFORE auth handler as it uses it's own auth method
import upload from "./upload/index.js";

router.use("/upload", upload);

router.use(authHandler);

import auth_login from "./auth/login.js";
import auth_register from "./auth/register.js";

router.use("/auth", rateLimiter("auth"));
router.use("/auth", auth_register, auth_login);

router.use(rateLimiter("global"));

import invite from "./invite/index.js";

router.use("/invite", invite);

import users_me from "./users/@me/index.js";

router.use("/users/@me", users_me);

import users_me_upload from "./users/@me/upload.js";

router.use("/users/@me/upload", users_me_upload);

import users_me_guild from "./users/@me/guild.js";

router.use("/users/@me/guild", users_me_guild);

import users_me_channels from "./users/@me/channels.js";

router.use("/users/@me/channels", users_me_channels);

import users_me_push from "./users/@me/push.js";

router.use("/users/@me/push", users_me_push);

import users_id from "./users/:id/index.js";

router.use("/users/:user_id", users_id);

import users_id_channels from "./users/:id/channels.js";

router.use("/users/:user_id/channels", users_id_channels);

import users_id_relationship from "./users/:id/relationship.js";

router.use("/users/:user_id/relationship", users_id_relationship);

import users_id_attachments from "./users/:id/attachments.js";

router.use("/users/:user_id/attachments", users_id_attachments);

import guild from "./guild/index.js";

router.use("/guild", guild);

import guild_id from "./guild/:id/index.js";

router.use("/guild/:guild_id", guild_id);

import guild_id_channel from "./guild/:id/channel.js";

import role_id from "./role/:id/index.js";

router.use("/role/:role_id", role_id);

router.use("/guild/:guild_id/channel", guild_id_channel);

import guild_id_roles from "./guild/:id/roles.js";

router.use("/guild/:guild_id/roles", guild_id_roles);

import guild_id_members from "./guild/:id/members/index.js";

router.use("/guild/:guild_id/members", guild_id_members);

import guild_id_members_id from "./guild/:id/members/:id/index.js";

router.use("/guild/:guild_id/members/:user_id", guild_id_members_id);

import channels_id from "./channel/:id/index.js";

router.use("/channel/:channel_id", channels_id);

import channels_id_messages from "./channel/:id/messages/index.js";

router.use("/channel/:channel_id/messages", channels_id_messages);

import channels_id_call from "./channel/:id/call.js";

router.use("/channel/:channel_id/call", channels_id_call);

import channels_id_attachments from "./channel/:id/attachments.js";

router.use("/channel/:channel_id/attachments", channels_id_attachments);

import channels_id_messages_id from "./channel/:id/messages/:id/index.js";

router.use("/channel/:channel_id/messages/:message_id", channels_id_messages_id);

export default router;
