import nodeConfig from "config";
import { tryParseUrl } from "./url";

const LOCALHOST_URL = new URL("http://localhost");

const ifExistsGet = <T>(key: string): T | undefined => {
	return nodeConfig.has(key) ? nodeConfig.get(key) : undefined;
};

const config = Object.freeze({
	security: {
		/**
		 * The Jsonwebtoken secret used to generate authentication tokens.
		 * Generate with `crypto.randomBytes(256).toString("base64")`
		 */
		jwt_secret: nodeConfig.get<string>("security.jwt_secret"),

		/**
		 * How to determine the client IP when behind a proxy
		 * https://expressjs.com/en/guide/behind-proxies.html
		*/
		trust_proxy:
			ifExistsGet<string>("security.trust_proxy") ??
			"loopback,uniquelocal",
	},

	database: {
		/**
		 * A URL style database connection string
		 * @example `mysql://username:password@address:port/database_name`
		 */
		url: nodeConfig.get<string>("database.url"),

		/**
		 * Whether to log database operations.
		 */
		log: ifExistsGet<boolean>("database.log"),
	},

	federation: ifExistsGet<boolean>("federation.enabled")
		? {
				/**
				 * Is federation enabled?
				 * If disabled, foreign network features will be unavailable.
				 */
				enabled: true,

				/**
				 * The URL of the webapp for this instance.
				 * If not set/invalid, the webapp will simple be disabled.
				 * The federation.instance_url will be used instead.
				 */
				webapp_url:
					tryParseUrl(nodeConfig.get("federation.webapp_url")) ??
					new URL(nodeConfig.get<string>("federation.instance_url")),

				/**
				 * The URL of this instance. Required.
				 */
				instance_url: new URL(
					nodeConfig.get<string>("federation.instance_url"),
				),
		  }
		: {
				enabled: false,
				webapp_url: LOCALHOST_URL,
				instance_url: LOCALHOST_URL,
		  },

	registration: ifExistsGet<boolean>("registration.enabled")
		? {
				/**
				 * If registration is disabled, new users cannot be created from the API.
				 * The CLI can still be used to create users using admin opereations.
				 */
				enabled: true,

				/**
				 * TODO: Whether to force a captcha to be completed for new registrations.
				 */
				require_captcha: ifExistsGet<boolean>(
					"registration.require_captcha",
				),

				/**
				 * TODO: Whether to require an email address for new registrations.
				 * TODO: If enabled and an email server has been configured, verification emails will be sent.
				 */
				require_email: ifExistsGet<boolean>(
					"registration.require_email",
				),
		  }
		: { enabled: false },
});

export { config };
