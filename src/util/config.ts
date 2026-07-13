// import nodeConfig from "config";

import type { ZodObject } from "zod";
import { ConfigSchema } from "./ConfigSchema.js";
import { createLogger } from "./log.js";

// Because node-config reads the config files when the file is imported
// we can't import it at the top level.
// In commonjs, we can use sync require but in esmodules we can't
// and I can't make the `config` method async
// and so, we're forced to use createRequire here
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

const Log = createLogger("config");

let configCache: ConfigSchema | undefined;

const sourceType = (schema: ZodObject) => {
	if ("innerType" in schema.def) return sourceType(schema.def.innerType as ZodObject);

	return schema;
};

const parseConfig = () => {
	const nodeConfig = require("config");

	const recursion = (schema: ZodObject, path: string) => {
		if (schema.shape) {
			// schema is an object

			const ret: Record<string, unknown> = {};

			for (const key in schema.shape) {
				const value = sourceType(schema.shape[key]);

				const loaded = recursion(value, `${path ? `${path}.` : ""}${key}`);

				if (loaded !== undefined) ret[key] = loaded;
			}

			return Object.keys(ret).length ? ret : undefined;
		}

		// otherwise schema is a primitive value

		return nodeConfig.has(path) ? nodeConfig.get(path) : undefined;
	};

	const object = recursion(ConfigSchema, "");

	return ConfigSchema.safeParse(object);
};

const config = () => {
	if (!configCache) {
		const res = parseConfig();

		if (res.error) {
			for (const issue of res.error.issues) {
				Log.error(`${issue.path.join(".")}: ${issue.message}`);
			}

			process.exit(1);
		}

		configCache = res.data;
	}

	return configCache;
};

export { config };
