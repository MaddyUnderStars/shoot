import { Router } from "express";

const router = Router();

import auth_login from "./auth/login";
import auth_register from "./auth/register";
router.use("/auth", auth_register, auth_login);

import users_id from "./users/#id";
router.use("/users/:user_id", users_id);

import users_id_channels from "./users/#id/channels";
router.use("/users/:user_id/channels", users_id_channels);

import channels_id_messages from "./channel/#id/messages";
router.use("/channel/:channel_id/messages", channels_id_messages);

export default router;
