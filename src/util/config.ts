import nodeConfig from "config";
import { tryParseUrl } from "./url";

const LOCALHOST_URL = new URL("http://localhost");

const ifExistsGet = <T>(key: string): T | undefined => {
	return nodeConfig.has(key) ? nodeConfig.get(key) : undefined;
};

const config = Object.freeze({
	http: {
		/**
		 * Whether to enable morgan logging of http requests.
		 * Example: `200, 404` will log requests with status codes 200, 400
		 * Example: `-200` will log all non-200 responses
		 * Example `-` will log all responses
		 */
		log: ifExistsGet<string>("http.log"),

		/** Ratelimiter */
		rate: Object.fromEntries(
			["s2s", "auth", "nodeinfo", "wellknown", "global"].map((type) => [
				type,
				{
					/** Milliseconds. Default: 15 minutes */
					window:
						ifExistsGet<number>(`http.rate.${type}.window`) ??
						15 * 60 * 1000,

					/** Number of requests per window. Default: 100 */
					limit: ifExistsGet<number>(`http.rate.${type}limit`) ?? 100,
				},
			]),
		),
	},

	security: {
		/**
		 * The Jsonwebtoken secret used to generate authentication tokens.
		 * Generate with `crypto.randomBytes(256).toString("base64")`
		 */
		jwt_secret: nodeConfig.get<string>("security.jwt_secret"),

		/**
		 * How to determine the client IP when behind a proxy
		 * https://expressjs.com/en/guide/behind-proxies.html
		 *
		 * @default loopback,uniquelocal
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

				require_http_signatures:
					ifExistsGet<boolean>(
						"federation.require_http_signatures",
					) ?? false,

				/**
				 * The public and private keys of the instance actor (/actor)
				 * used for verifying and signing HTTP signatures
				 */
				public_key: nodeConfig.get<string>("federation.public_key"),
				private_key: nodeConfig.get<string>("federation.private_key"),
			}
		: {
				enabled: false,
				webapp_url: LOCALHOST_URL,
				instance_url: LOCALHOST_URL,
				require_http_signatures: false,
				public_key: "",
				private_key: "",
			},

	registration: ifExistsGet<boolean>("registration.enabled")
		? {
				/**
				 * If registration is disabled, new users cannot be created from the API.
				 * The CLI can still be used to create users using admin opereations.
				 */
				enabled: true,
			}
		: { enabled: false },
});

export { config };
