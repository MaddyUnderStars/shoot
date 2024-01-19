import { Router } from "express";
import hostMeta from "./host-meta";
import webfinger from "./webfinger";

const router = Router();

router.use("/.well-known", hostMeta, webfinger);

export default router;