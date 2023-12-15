import { Router } from "express";
import api from "./api";
import s2s from "./s2s";
import wellknown from "./wellknown";

const router = Router();

router.use("/", api);
router.use("/", wellknown);
router.use("/s2s", s2s);

export default router;
