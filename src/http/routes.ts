import { Router } from "express";
import { ACTIVITY_JSON_ACCEPT } from "../util";
import api from "./api";
import s2s from "./s2s";
import wellknown from "./wellknown";

const router = Router();

// Mount the s2s API on / based on the Accept header
router.use("/", (req, res, next) => {
	const header = req.headers.accept;

	res.setHeader("Content-Type", "application/activity+json; charset=utf-8");

	if (
		ACTIVITY_JSON_ACCEPT.some((v) => req.headers.accept?.includes(v)) ||
		ACTIVITY_JSON_ACCEPT.some(
			(v) => req.headers["content-type"]?.includes(v),
		)
	) {
		return s2s(req, res, next);
	}

	return next();
});

router.use("/", api);
router.use("/", wellknown);

export default router;
