import { Router } from "express";
import api from "./api";
import wellknown from "./wellknown";

const router = Router();

router.use("/", api);
router.use("/", wellknown);

export default router;
