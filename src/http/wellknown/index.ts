import { Router } from "express";
import { rateLimiter } from "../middleware/rate.js";
import hostMeta from "./host-meta.js";
import nodeInfo from "./nodeinfo.js";
import webfinger from "./webfinger.js";

const router = Router();

router.use("/.well-known/nodeinfo", rateLimiter("nodeinfo"), nodeInfo);
router.use("/.well-known", rateLimiter("wellknown"), hostMeta, webfinger);

export default router;
