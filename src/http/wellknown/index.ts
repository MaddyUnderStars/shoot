import { Router } from "express";
import hostMeta from "./host-meta";
import nodeInfo from "./node-info";
import webfinger from "./webfinger";

const router = Router();

router.use("/.well-known", hostMeta, webfinger, nodeInfo);

export default router;