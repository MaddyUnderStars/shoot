import { Router } from "express";
import type { Grant } from "oidc-provider";
import { HttpError } from "../../../util/httperror";
import { route } from "../../../util/route";
import { getOidcProvider } from "../../oidc";

const router = Router({ mergeParams: true });

router.post(
	"/confirm",
	route({}, async (req, res) => {
		const provider = getOidcProvider();

		const {
			prompt: { name, details },
			params,
			session,
			grantId,
		} = await provider.interactionDetails(req, res);

		if (name !== "consent") throw new HttpError("name must be consent");

		let grant: Grant | undefined;
		if (grantId) {
			// modify existing grant

			grant = await provider.Grant.find(grantId);
		} else {
			grant = new provider.Grant({
				accountId: session?.accountId,
				clientId: params.client_id as string,
			});
		}

		// TODO: https://github.com/panva/node-oidc-provider/blob/main/example/routes/express.js
	}),
);

export default router;
