import { Router } from "express";
import { verifyHttpSig } from "../middleware";

const router = Router();

router.use(verifyHttpSig);

import inbox from "./inbox";
router.use("/inbox", inbox);

import users_id from "./users/#id";
router.use("/users/:user_id", users_id);

import channel_id from "./channel/#id";
router.use("/channel/:channel_id", channel_id);

import guilds_id from "./guild/#id";
router.use("/guild/:guild_id", guilds_id);

import invite_id from "./invite/#id";
router.use("/invite/:invite_id", invite_id);

import channel_id_message_id from "./channel/#id/message/#id";
router.use("/channel/:channel_id/message/:message_id", channel_id_message_id);

import actor from "./actor";
router.use("/actor", actor);

export default router;
