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

import actor from "./actor";
router.use("/actor", actor);

export default router;
