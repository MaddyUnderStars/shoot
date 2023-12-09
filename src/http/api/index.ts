import { Router } from "express";

const router = Router();

import auth from "./auth";
router.use("/", auth);

export default router;