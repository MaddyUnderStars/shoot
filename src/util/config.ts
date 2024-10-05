import nodeConfig from "config";
import { tryParseUrl } from "./url";

const LOCALHOST_URL = new URL("http://localhost");

const ifExistsGet = <T>(key: string): T | undefined => {
	return nodeConfig.has(key) ? nodeConfig.get(key) : undefined;
};

const getArray = <T>(key: string): T[] => {
	let i = 0;
	const ret: T[] = [];
	while (nodeConfig.has(`${key}[${i}]`)) {
		ret.push(nodeConfig.get(`${key}[${i}]`));
		i++;
	}
	return ret;
};

const config = Object.freeze({
	http: {
		/**
		 * Whether to enable morgan logging of http requests.
		 * @example `200, 404` will log requests with status codes 200, 400
		 * @example `-200` will log all non-200 responses
		 * @example `-` will log all responses
		 */
		log: ifExistsGet<string>("http.log"),

		/**
		 * Log format to use when morgan logging is enabled
		 * @see https://www.npmjs.com/package/morgan#predefined-formats
		 * @default "combined"
		 */
		log_format: ifExistsGet<string>("http.log_format") ?? "combined",

		/**
		 * Rate limiter for incoming HTTP API requests.
		 * Valid keys: `s2s`, `auth`, `nodeinfo`, `wellknown`, `global`
		 */
		rate: ifExistsGet("http.rate")
			? Object.fromEntries(
					["s2s", "auth", "nodeinfo", "wellknown", "global"].map(
						(type) => [
							type,
							{
								/**
								 * Milliseconds
								 * @default 15 minutes
								 */
								window:
									ifExistsGet<number>(
										`http.rate.${type}.window`,
									) ?? 15 * 60 * 1000,

								/**
								 * Number of requests per window.
								 * @default Default: 100
								 */
								limit:
									ifExistsGet<number>(
										`http.rate.${type}limit`,
									) ?? 100,
							},
						],
					),
				)
			: (false as false),
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
		 * @default "loopback,uniquelocal"
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

				queue: {
					/**
					 * Whether or not to use the inbound queue. Requires redis.
					 * @default true
					 */
					use_inbound:
						ifExistsGet<boolean>("federation.queue.use_inbound") ??
						true,

					/**
					 * Whether or not to use the inbound queue. Requires redis.
					 * @default true
					 */
					use_outbound:
						ifExistsGet<boolean>("federation.queue.use_outbound") ??
						true,
				},

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
				queue: {
					use_inbound: true,
					use_outbound: true,
				},
			},

	webrtc: {
		/** Janus gateway api secret */
		janus_secret: ifExistsGet<string>("webrtc.janus_secret"),
		/**
		 * Janus gateway url. Websocket, http, or unix socket
		 * @default "ws://localhost:8188"
		 */
		janus_url:
			ifExistsGet<string>("webrtc.janus_url") ?? "ws://localhost:8188",

		// signalling_servers: getArray<string>("webrtc.signalling_servers"),
		signal_address: ifExistsGet<string>("webrtc.signal_address"),
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
