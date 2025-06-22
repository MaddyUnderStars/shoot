import bodyParser from "body-parser";
import { Router } from "express";
import { authHandler, rateLimiter } from "../middleware";

const router = Router();

// These are here instead of in ApiServer because otherwise we end up
// preventing bodyParser.raw from executing for http signature verification (#35 and #50)
router.use(bodyParser.json({ inflate: true }));
router.use(bodyParser.urlencoded({ inflate: true, extended: true }));

// BEFORE auth handler as it uses it's own auth method
import upload from "./upload";
router.use("/upload", upload);

router.use(authHandler);

import auth_login from "./auth/login";
import auth_register from "./auth/register";
router.use("/auth", rateLimiter("auth"));
router.use("/auth", auth_register, auth_login);

router.use(rateLimiter("global"));

import invite from "./invite";
router.use("/invite", invite);

import users_me from "./users/@me";
router.use("/users/@me", users_me);

import users_me_guild from "./users/@me/guild";
router.use("/users/@me/guild", users_me_guild);

import users_me_channels from "./users/@me/channels";
router.use("/users/@me/channels", users_me_channels);

import users_id from "./users/#id";
router.use("/users/:user_id", users_id);

import users_id_channels from "./users/#id/channels";
router.use("/users/:user_id/channels", users_id_channels);

import users_id_relationship from "./users/#id/relationship";
router.use("/users/:user_id/relationship", users_id_relationship);

import guild from "./guild";
router.use("/guild", guild);

import guild_id from "./guild/#id";
router.use("/guild/:guild_id", guild_id);

import guild_id_channel from "./guild/#id/channel";
router.use("/guild/:guild_id/channel", guild_id_channel);

import channels_id from "./channel/#id";
router.use("/channel/:channel_id", channels_id);

import channels_id_messages from "./channel/#id/messages";
router.use("/channel/:channel_id/messages", channels_id_messages);

import channels_id_call from "./channel/#id/call";
router.use("/channel/:channel_id/call", channels_id_call);

import channels_id_attachments from "./channel/#id/attachments";
router.use("/channel/:channel_id/attachments", channels_id_attachments);

import channels_id_messages_id from "./channel/#id/messages/#id";
router.use(
	"/channel/:channel_id/messages/:message_id",
	channels_id_messages_id,
);

export default router;
