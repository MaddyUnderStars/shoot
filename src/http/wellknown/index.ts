import { Router } from "express";
import { rateLimiter } from "../middleware";
import hostMeta from "./host-meta";
import webfinger from "./webfinger";

const router = Router();

router.use(rateLimiter("wellknown"));

router.use("/.well-known", hostMeta, webfinger);

export default router;
