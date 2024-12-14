import { Router } from "express";
import { rateLimiter } from "../middleware";
import hostMeta from "./host-meta";
import nodeInfo from "./nodeinfo";
import webfinger from "./webfinger";

const router = Router();

router.use("/.well-known/nodeinfo", rateLimiter("nodeinfo"), nodeInfo);
router.use("/.well-known", rateLimiter("wellknown"), hostMeta, webfinger);

export default router;
