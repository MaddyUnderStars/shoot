import { Router } from "express";
import { ACTIVITY_JSON_ACCEPT } from "../util";
import api from "./api";
import s2s from "./s2s";
import wellknown from "./wellknown";

const router = Router();

// Mount the s2s API on / based on the Accept header
router.use("/", (req, res, next) => {
	const header = req.headers.accept;

	if (header?.includes(ACTIVITY_JSON_ACCEPT)) {
		return s2s(req, res, next);
	}

	return next();
});

router.use("/", api);
router.use("/", wellknown);

export default router;
