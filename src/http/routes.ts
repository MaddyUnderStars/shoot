import type { IncomingHttpHeaders } from "node:http";
import { Router } from "express";
import { ACTIVITY_JSON_ACCEPT } from "../util/activitypub/constants.js";
import api from "./api/index.js";
import s2s from "./s2s/index.js";
import wellknown from "./wellknown/index.js";

const router = Router();

export const isFederationRequest = (headers: IncomingHttpHeaders) =>
	ACTIVITY_JSON_ACCEPT.some((v) => headers.accept?.includes(v)) ||
	ACTIVITY_JSON_ACCEPT.some((v) => headers["content-type"]?.includes(v));

// Mount the s2s API on / based on the Accept header
router.use("/", (req, res, next) => {
	if (isFederationRequest(req.headers)) {
		res.setHeader("Content-Type", "application/activity+json; charset=utf-8");
		s2s(req, res, next);
	} else api(req, res, next);
});

router.use("/", wellknown);

export default router;
