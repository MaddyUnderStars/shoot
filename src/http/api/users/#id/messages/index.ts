/**
 * TEMP ROUTES FOR TESTING AP
 */

import { Router } from "express";
import { z } from "zod";
import { config, route } from "../../../../../util";

const router = Router();

const MessageCreate = z.object({
	content: z.string(),
});

router.post(
	"/",
	route(
		{
			body: MessageCreate,
		},
		async (req, res) => {
			const host = config.federation.webapp_url.origin;

		},
	),
);

export default router;
