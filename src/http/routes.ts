import { Router } from "express";
import { ACTIVITY_JSON_ACCEPT } from "../util";
import api from "./api";
import s2s from "./s2s";
import wellknown from "./wellknown";

const router = Router();

// Mount the s2s API on / based on the Accept header
router.use("/", (req, res, next) => {
	res.setHeader("Content-Type", "application/activity+json; charset=utf-8");

	if (
		ACTIVITY_JSON_ACCEPT.some((v) => req.headers.accept?.includes(v)) ||
		ACTIVITY_JSON_ACCEPT.some((v) =>
			req.headers["content-type"]?.includes(v),
		)
	) {
		s2s(req, res, next);
	} else {
		api(req, res, next);
	}
});

router.use("/", wellknown);

export default router;
