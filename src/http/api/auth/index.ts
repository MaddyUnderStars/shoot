import { Router } from "express";

const router = Router();

import login from "./login";
import register from "./register";
router.use("/auth", register, login);

export default router;
