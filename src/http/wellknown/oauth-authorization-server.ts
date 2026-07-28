import { Router } from "express";
import { route } from "../../util/route.js";
import { config } from "../../util/config.js";
import { makeInstanceUrl } from "../../util/url.js";

const router = Router();

router.get(
	"/",
	route({}, async (_req, res) => {
		return res.json({
			issuer: config().federation.instance_url.origin,
			authorization_endpoint: makeInstanceUrl("/oauth/authorize"),
			token_endpoint: makeInstanceUrl("/oauth/token"),
			registration_endpoint: makeInstanceUrl("/oauth/register"),
			response_types_supported: ["code"],
			response_modes_supported: ["query", "fragment", "form_post"],
			grant_types_supported: ["authorization_code", "client_credentials"],
		});
	}),
);

export default router;
