import { Router } from "express";

const router = Router();

import auth_login from "./auth/login";
import auth_register from "./auth/register";
router.use("/auth", auth_register, auth_login);

import users_id from "./users/#id";
router.use("/users", users_id);

import users_id_messages from "./users/#id/messages";
router.use("/users/:id", users_id_messages);

export default router;
