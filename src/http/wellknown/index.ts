import { Router } from "express";
import { rateLimiter } from "../middleware/rate.js";
import hostMeta from "./host-meta.js";
import nodeInfo from "./nodeinfo.js";
import webfinger from "./webfinger.js";
import oauth from "./oauth-authorization-server.js";

const router = Router();

router.use("/.well-known/nodeinfo", rateLimiter("nodeinfo"), nodeInfo);
router.use("/.well-known", rateLimiter("wellknown"), hostMeta, webfinger);
router.use("/.well-known/oauth-authorization-server", rateLimiter("wellknown"), oauth);

export default router;
