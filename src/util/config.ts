import nodeConfig from "config";
import type { InstanceBehaviour } from "./activitypub/instanceBehaviour";
import { tryParseUrl } from "./url";

const LOCALHOST_URL = new URL("http://localhost");

const ifExistsGet = <T>(key: string): T | undefined => {
	return nodeConfig.has(key) ? nodeConfig.get(key) : undefined;
};

const get = <T>(key: string): T => {
	try {
		return nodeConfig.get(key);
	} catch (e) {
		console.error(e instanceof Error ? e.message : e);
		process.exit();
	}
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
		 * Generate with `crypto.randomBytes(256).toString("base64")` or `npm run cli -- generate-keys`
		 */
		jwt_secret: get<string>("security.jwt_secret"),

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
		url: get<string>("database.url"),

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
				 * If not set/invalid, the federation.instance_url will be used instead.
				 */
				webapp_url:
					tryParseUrl(get("federation.webapp_url")) ??
					new URL(get<string>("federation.instance_url")),

				/**
				 * The URL of this instance. Required.
				 */
				instance_url: new URL(get<string>("federation.instance_url")),

				/**
				 * Aka, authorised fetch. Require HTTP signatures from remote servers for all requests
				 * If disabled, only require when absolutely necessary such as when receiving a new chat message,
				 * while reading public data will still be allowed.
				 */
				require_http_signatures:
					ifExistsGet<boolean>(
						"federation.require_http_signatures",
					) ?? false,

				/**
				 * Various settings related to the federation queues implemented using Redis.
				 * You can configure Redis via the `redis.*` config options.
				 */
				queue: {
					/**
					 * Whether or not to use the inbound queue. Requires redis.
					 * @default false
					 */
					use_inbound:
						ifExistsGet<boolean>("federation.queue.use_inbound") ??
						false,
				},

				/**
				 * The public and private keys of the instance actor (/actor)
				 * used for verifying and signing HTTP signatures
				 */
				public_key: get<string>("federation.public_key"),
				private_key: get<string>("federation.private_key"),

				/**
				 * Control whether the `federation.instances` property is a denylist or allowlist
				 *
				 * @default false
				 */
				allowlist:
					ifExistsGet<boolean>("federation.allowlist") ?? false,

				/**
				 * Control how Shoot handles requests from different instances
				 * This is a key-value store where the key is `new URL(instance).origin`
				 * and the value is the desired behaviour defined by InstanceBehaviour
				 *
				 * TODO it would be good if we could provide reasons for these
				 */
				instances:
					ifExistsGet<{
						[instance: string]: InstanceBehaviour;
					}>("federation.instances") ?? {},
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
				},
				allowlist: false,
				instances: {},
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
				 * The CLI can still be used to create users using admin operations.
				 */
				enabled: true,
			}
		: { enabled: false },

	storage: {
		/**
		 * The local directory to upload user content.
		 * If storage.s3.* is defined and valid, s3 will be used instead
		 * @default "./storage"
		 */
		directory: ifExistsGet<string>("storage.directory") ?? "./storage",

		/**
		 * Maximum size of user uploaded content in bytes
		 * @default 10mb
		 */
		max_file_size:
			ifExistsGet<number>("storage.max_file_size") ?? 1024 * 1024 * 10,

		s3: ifExistsGet<boolean>("storage.s3.enabled")
			? {
					enabled: true,

					/**
					 * The endpoint to use for s3 storage.
					 * If not provided, uses aws s3
					 */
					endpoint: ifExistsGet<string>("storage.s3.endpoint"),

					region: get<string>("storage.s3.region"),

					bucket: get<string>("storage.s3.bucket"),

					accessKey: get<string>("storage.s3.accessKey"),

					secret: get<string>("storage.s3.secret"),

					/**
					 * Whether to force path style URLs for S3 objects
					 * (e.g., https://s3.amazonaws.com/{bucket}/ instead of https://{bucket}.s3.amazonaws.com/
					 */
					forcePathStyle:
						ifExistsGet<boolean>("storage.s3.forcePathStyle") ??
						false,
				}
			: {
					enabled: false,
					endpoint: undefined,
					region: "",
					bucket: "",
					accessKey: "",
					secret: "",
				},
	},

	/**
	 * Redis is optional. It is currently only used for the inbound federation queue
	 */
	redis: {
		/**
		 * The IP/hostname of the Redis instance to connect to
		 *
		 * @default "localhost"
		 */
		host: ifExistsGet<string>("redis.host") ?? "localhost",

		/**
		 * The port to use when connecting to a Redis host
		 *
		 * @default 6379
		 */
		port: ifExistsGet<number>("redis.port") ?? 6379,
	},
});

export { config };
