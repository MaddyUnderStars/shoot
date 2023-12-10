import { Router } from "express";

const router = Router();

import id from "./#id";
router.use("/users/", id);

export default router;
