import crypto from "crypto";
import { KEY_OPTIONS } from "../../src/util/rsa";

// export const RANDOM_PORT = Math.round(Math.random() * 4) + 1000;

// process.env.PORT = RANDOM_PORT.toString();

export const proxyConfig = () => {
	const keys = crypto.generateKeyPairSync("rsa", KEY_OPTIONS);

	process.env.NODE_CONFIG_DIR = `${process.cwd()}/test/helpers/config`;

	process.env.NODE_CONFIG = JSON.stringify({
		http: {
			log: "-200",
		},
		database: {
			log: false,
		},
		security: {
			jwt_secret: crypto.randomBytes(256).toString("base64"),
		},
		federation: {
			enabled: true,
			webapp_url: new URL(`http://localhost`),
			instance_url: new URL(`http://localhost`),
			require_http_signatures: true,
			public_key: keys.publicKey,
			private_key: keys.privateKey,
		},
		registration: {
			enabled: true,
		},
	});
};
