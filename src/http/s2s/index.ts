import bodyParser from "body-parser";
import { Router } from "express";
import { rateLimiter, verifyHttpSig } from "../middleware";

const router = Router();

// rate limit before http signature verification
// so that we don't do unwanted work
router.use(rateLimiter("s2s"));

router.use(verifyHttpSig);

// see comments in verifyHttpSig
router.use((req, res, next) => {
	// we want to only run bodyParser.json if req.body doesn't exist
	if (req.body && Buffer.isBuffer(req.body)) {
		// bodyParser.raw was run above, we need to JSON.parse it for the rest of our handlers
		req.body = JSON.parse(req.body.toString());
		return next();
	}

	// we didn't run verifyHttpSig on this request
	// so we don't have raw body
	// need to run normal json handler now
	const parser = bodyParser.json({
		type: ACTIVITY_JSON_ACCEPT,
		inflate: true,
	});
	parser(req, res, next);
});

import inbox from "./inbox";
router.use("/inbox", inbox);

import users_id from "./users/#id";
router.use("/users/:user_id", users_id);

import channel_id from "./channel/#id";
router.use("/channel/:channel_id", channel_id);

import guilds_id from "./guild/#id";
router.use("/guild/:guild_id", guilds_id);

import guild_id_role from "./guild/#id/role";
router.use("/guild/:guild_id/role", guild_id_role);

import invite_id from "./invite/#id";
router.use("/invite/:invite_id", invite_id);

import channel_id_message_id from "./channel/#id/message/#id";
router.use("/channel/:channel_id/message/:message_id", channel_id_message_id);

import { ACTIVITY_JSON_ACCEPT } from "../../util";
import actor from "./actor";
router.use("/actor", actor);

export default router;
