import { Router } from "express";
import { authHandler } from "../middleware";

const router = Router();

// BEFORE auth handler
import nodeInfo from "./nodeinfo";
router.use("/nodeinfo/2.0", nodeInfo)

router.use(authHandler);

import auth_login from "./auth/login";
import auth_register from "./auth/register";
router.use("/auth", auth_register, auth_login);

import users_me from "./users/@me";
router.use("/users/@me", users_me);

import users_id from "./users/#id";
router.use("/users/:user_id", users_id);

import users_id_channels from "./users/#id/channels";
router.use("/users/:user_id/channels", users_id_channels);

import channels_id_messages from "./channel/#id/messages";
router.use("/channel/:channel_id/messages", channels_id_messages);

import channels_id_messages_id from "./channel/#id/messages/#id";
router.use("/channel/:channel_id/messages/:message_id", channels_id_messages_id);

export default router;
