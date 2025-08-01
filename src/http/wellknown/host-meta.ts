import { Router } from "express";
import { config } from "../../util/config";
import { HttpError } from "../../util/httperror";
import { route } from "../../util/route";

const router = Router();

router.get(
	"/host-meta",
	route({}, async (_req, res) => {
		if (!config.federation.enabled)
			throw new HttpError("Federation is disabled", 400);

		res.setHeader("Content-Type", "application/xrd+xml");

		const host = config.federation.instance_url.origin;

		const ret = `<?xml version="1.0" encoding="UTF-8"?>
		<XRD
			xmlns="http://docs.oasis-open.org/ns/xri/xrd-1.0">
			<Link rel="lrdd" type="application/xrd+xml" template="${host}/.well-known/webfinger?resource={uri}"/>
		</XRD>`;

		return res.send(ret);
	}),
);

export default router;
