import * as oidc from "oidc-provider";
import { User } from "../entity/user";
import { config } from "../util/config";

let provider: oidc.Provider | null = null;

export const getOidcProvider = () => {
	provider =
		provider ||
		new oidc.Provider(config().security.oidc_issuer, {
			async findAccount(ctx, id) {
				const user = await User.findOneOrFail({
					where: {
						name: id,
						domain: config().federation.webapp_url.hostname,
					},
				});

				return {
					accountId: id,
					async claims(use, scope) {
						return { sub: id };
					},
				};
			},
			clients: [
				{
					client_id: "test",
					client_secret: "test",
					redirect_uris: ["https://understars.dev/shoot-client"],
					response_types: ["code"],
					grant_types: ["authorization_code"],
				},
			],
		});

	return provider;
};
