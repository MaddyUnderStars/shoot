import nodeConfig from "config";
import z from "zod";
import { InstanceBehaviour } from "./activitypub/instanceBehaviour";
import { LogLevel } from "./log";

// const LOCALHOST_URL = new URL("http://localhost");

const ifExistsGet = <T>(key: string): T | undefined => {
	return nodeConfig.has(key) ? nodeConfig.get(key) : undefined;
};

// const get = <T>(key: string): T => {
// 	try {
// 		return nodeConfig.get(key);
// 	} catch (e) {
// 		console.error(e instanceof Error ? e.message : e);
// 		process.exit();
// 	}
// };

const RateLimitSchema = z.object({
	/**
	 * Milliseconds
	 * @default 15 minutes
	 */
	window: z.number().default(15 * 60 * 1000),

	/**
	 * Number of requests per window.
	 * @default Default: 100
	 */
	limit: z.number().default(100),
});

const ConfigSchema = z.object({
	/**
	 * Shoots own logging configuration
	 */
	log: z
		.object({
			/**
			 * Maximum level of logs to print
			 * see LogLevel enum for values
			 * @default "verbose"
			 */
			level: z.nativeEnum(LogLevel).default(LogLevel.verbose),

			/**
			 * Whether or not to include dates in log messages
			 */
			include_date: z.boolean().default(true),
		})
		.default({}),
	http: z
		.object({
			/**
			 * Whether to enable morgan logging of http requests.
			 * @example `200, 404` will log requests with status codes 200, 400
			 * @example `-200` will log all non-200 responses
			 * @example `-` will log all responses
			 * @example `-200, 404` will log all codes except 200, 404
			 */
			log: z.string().optional(),

			/**
			 * Log format to use when morgan logging is enabled
			 * @see https://www.npmjs.com/package/morgan#predefined-formats
			 * @default "combined"
			 */
			log_format: z.string().default("combined"),

			/**
			 * Rate limiter for incoming HTTP API requests.
			 */
			rate: z
				.object({
					s2s: RateLimitSchema.default({}),
					auth: RateLimitSchema.default({}),
					nodeinfo: RateLimitSchema.default({}),
					wellknown: RateLimitSchema.default({}),
					global: RateLimitSchema.default({}),
				})
				.default({}),
		})
		.default({}),
	security: z.object({
		/**
		 * The Jsonwebtoken secret used to generate authentication tokens.
		 * Generate with `crypto.randomBytes(256).toString("base64")` or `npm run cli -- generate-keys`
		 */
		jwt_secret: z.string(),

		/**
		 * How to determine the client IP when behind a proxy
		 * https://expressjs.com/en/guide/behind-proxies.html
		 *
		 * @default "loopback,uniquelocal"
		 */
		trust_proxy: z.string().default("loopback,uniquelocal"),
	}),
	database: z.object({
		/**
		 * A URL style database connection string
		 * @example `mysql://username:password@address:port/database_name`
		 */
		url: z.string().url(),

		/**
		 * Whether to log database operations.
		 */
		log: z.boolean().default(false),
	}),
	federation: z
		.object({
			/**
			 * Is federation enabled?
			 * If disabled, foreign network features will be unavailable.
			 */
			enabled: z.boolean().default(false),

			/**
			 * The URL of the webapp for this instance.
			 * If not hosting a webapp, set this to the same value as instance_url
			 */
			webapp_url: z
				.string()
				.url()
				.transform((x) => new URL(x)),

			/**
			 * The URL of this instance. Required.
			 */
			instance_url: z
				.string()
				.url()
				.transform((x) => new URL(x)),

			/**
			 * Aka, authorised fetch. Require HTTP signatures from remote servers for all requests
			 * If disabled, only require when absolutely necessary such as when receiving a new chat message,
			 * while reading public data will still be allowed.
			 */
			require_http_signatures: z.boolean().default(false),

			/**
			 * Various settings related to the federation queues implemented using Redis.
			 * You can configure Redis via the `redis.*` config options.
			 */
			queue: z
				.object({
					/**
					 * Whether or not to use the inbound queue. Requires redis.
					 * @default false
					 */
					use_inbound: z.boolean().default(false),
				})
				.default({}),

			/**
			 * The public and private keys of the instance actor (/actor)
			 * used for verifying and signing HTTP signatures
			 */
			public_key: z.string(),
			private_key: z.string(),

			/**
			 * Control whether the `federation.instances` property is a denylist or allowlist
			 *
			 * @default false
			 */
			allowlist: z.boolean().default(false),

			/**
			 * Control how Shoot handles requests from different instances
			 * This is a key-value store where the key is `new URL(instance).origin`
			 * and the value is the desired behaviour defined by InstanceBehaviour
			 *
			 * TODO it would be good if we could provide reasons for these
			 */
			instances: z
				.record(z.string(), z.nativeEnum(InstanceBehaviour))
				.default({}),
		})
		.default({
			webapp_url: "http://localhost",
			instance_url: "http://localhost",
			public_key: "",
			private_key: "",
		}),
	webrtc: z
		.object({
			/**
			 * If Webrtc is disabled, voice calls will not be allowed and the signalling server
			 * will not be started.
			 */
			enabled: z.boolean().default(false),

			/** Janus gateway api secret */
			janus_secret: z.string().optional(),

			/**
			 * Janus gateway url. Websocket, http, or unix socket
			 * @default "ws://localhost:8188"
			 */
			janus_url: z.string().url().default("ws://localhost:8188"),

			signal_address: z.string().url().optional(),
		})
		.default({}),
	registration: z
		.object({
			/**
			 * If registration is disabled, new users cannot be created from the API.
			 * The CLI can still be used to create users using admin operations.
			 */
			enabled: z.boolean().default(false),
		})
		.default({}),
	storage: z
		.object({
			/**
			 * The local directory to upload user content.
			 * If storage.s3.* is defined and valid, s3 will be used instead
			 * @default "./storage"
			 */
			directory: z.string().default("./storage"),

			/**
			 * Maximum size of user uploaded content in bytes
			 * @default 10mb
			 */
			max_file_size: z.number().default(1024 * 1024 * 10),
			s3: z
				.object({
					enabled: z.boolean().default(false),

					/**
					 * The endpoint to use for s3 storage.
					 * If not provided, uses aws s3
					 */
					endpoint: z.string().optional(),
					region: z.string(),
					bucket: z.string(),
					accessKey: z.string(),
					secret: z.string(),

					/**
					 * Whether to force path style URLs for S3 objects
					 * (e.g., https://s3.amazonaws.com/{bucket}/ instead of https://{bucket}.s3.amazonaws.com/
					 */
					forcePathStyle: z.boolean().default(false),
				})
				.default({ region: "", bucket: "", accessKey: "", secret: "" }),
		})
		.default({}),

	/**
	 * Redis is optional. It is currently only used for the inbound federation queue
	 */
	redis: z
		.object({
			/**
			 * The IP/hostname of the Redis instance to connect to
			 *
			 * @default "localhost"
			 */
			host: z.string().default("localhost"),

			/**
			 * The port to use when connecting to a Redis host
			 *
			 * @default 6379
			 */
			port: z.number().default(6379),
		})
		.default({}),

	/**
	 * RabbitMQ is optional.
	 * It is required if you:
	 * - use the inbound federation queue
	 * - run api, gateway individually instead of as one process (i.e. via `npm run start:http` etc)
	 *
	 * It is used for sending events from the API, among other components, to the gateway
	 * when they do not share memory
	 */
	rabbitmq: z
		.object({
			enabled: z.boolean().default(false),
			url: z
				.string()
				.url()
				.transform((x) => new URL(x)),
		})
		.default({ url: "http://localhost" }),

	/**
	 * Media proxy settings. Shoot supports Imagor/Thumbor for proxying remote images.
	 * While optional, it's recommended this is enabled as it:
	 * - prevents simple IP grabbing of clients, or whatever other data is leaked when fetching media
	 * - prevents effectively DDOSing remote servers hosting media when being requests by many clients
	 */
	media_proxy: z
		.object({
			enabled: z.boolean().default(false),

			/**
			 * The public endpoint of the imagor proxy server. Clients will connect to this address.
			 */
			url: z.string().url(),

			/**
			 * Optional signing key to prevent users from generating their own media proxy requests
			 */
			secret: z.string().optional(),
		})
		.default({ url: "http://localhost" }),

	/**
	 * Push notifications via the Web Push API.
	 * Generate a public and private key via https://github.com/web-push-libs/web-push
	 * `npx web-push generate-vapid-keys`
	 */
	notifications: z
		.object({
			enabled: z.boolean().default(false),
			privateKey: z.string(),
			publicKey: z.string(),
		})
		.default({ publicKey: "", privateKey: "" }),
});

export type ConfigSchema = z.infer<typeof ConfigSchema>;

let configCache: ConfigSchema | undefined;

const parseConfig = () => {
	const recursion = (schema: z.AnyZodObject, path: string) => {
		if (schema.shape) {
			// schema is an object

			const ret: Record<string, unknown> = {};

			for (const key in schema.shape) {
				const value = schema.shape[key];

				const loaded = recursion(
					value,
					`${path ? `${path}.` : ""}${key}`,
				);

				if (loaded) ret[key] = loaded;
			}

			return Object.keys(ret).length ? ret : undefined;
		}

		// otherwise schema is a primitive value

		return ifExistsGet(path);
	};

	const object = recursion(ConfigSchema, "");

	return ConfigSchema.parse(object);
};

const config = () => {
	if (!configCache) configCache = parseConfig();

	return configCache;
};

export { config };
