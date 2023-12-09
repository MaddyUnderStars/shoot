import { Router } from "express";

const router = Router();

import register from "./register";
router.use("/auth", register);

export default router;