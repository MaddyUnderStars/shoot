import { Router } from "express";

const router = Router();

import auth from "./auth";
import users from "./users";
router.use("/", auth, users);

export default router;
