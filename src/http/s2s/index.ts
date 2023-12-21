import { Router } from "express";

const router = Router();

import users_id from "./users/#id";
router.use("/users/:user_id", users_id);

export default router;
