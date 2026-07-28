import { Router } from "express";
import { Oauth } from "../../../util/oauth.js";
import { route } from "../../../util/route.js";

const router = Router();

router.post("/", route({}, Oauth.token()));

export default router;
