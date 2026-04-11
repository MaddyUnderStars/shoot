import { Router } from "express";
import { HttpError } from "../../../util/httperror";
import { route } from "../../../util/route";
import { getOidcProvider } from "../../oidc";

const router = Router({ mergeParams: true });

router.get(
	"/",
	route({}, async (req, res) => {
		const provider = getOidcProvider();

		const { uid, prompt, params } = await provider.interactionDetails(
			req,
			res,
		);

		const { client_id } = params;

		if (typeof client_id !== "string")
			throw new HttpError("client_id not specified", 500);

		const client = provider.Client.find(client_id);

		switch (prompt.name) {
			case "login": {
				return res.render("login", {
					client,
					uid,
					details: prompt.details,
					params,
					title: "Sign-in",
				});
			}
			case "consent": {
				return res.render("interaction", {
					client,
					uid,
					details: prompt.details,
					params,
					title: "Authorize",
				});
			}
		}
	}),
);

export default router;
