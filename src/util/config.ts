// import nodeConfig from "config";
import type z from "zod";
import type { AnyZodObject } from "zod";
import { ConfigSchema } from "./ConfigSchema";

// const LOCALHOST_URL = new URL("http://localhost");

// const ifExistsGet = <T>(key: string): T | undefined => {
// 	return nodeConfig.has(key) ? nodeConfig.get(key) : undefined;
// };

// const get = <T>(key: string): T => {
// 	try {
// 		return nodeConfig.get(key);
// 	} catch (e) {
// 		console.error(e instanceof Error ? e.message : e);
// 		process.exit();
// 	}
// };

let configCache: ConfigSchema | undefined;

const sourceType = (schema: AnyZodObject) => {
	if ("innerType" in schema._def)
		return sourceType(schema._def.innerType as AnyZodObject);

	return schema;
};

const parseConfig = () => {
	const nodeConfig = require("config");

	const recursion = (schema: z.AnyZodObject, path: string) => {
		if (schema.shape) {
			// schema is an object

			const ret: Record<string, unknown> = {};

			for (const key in schema.shape) {
				const value = sourceType(schema.shape[key]);

				const loaded = recursion(
					value,
					`${path ? `${path}.` : ""}${key}`,
				);

				if (loaded !== undefined) ret[key] = loaded;
			}

			return Object.keys(ret).length ? ret : undefined;
		}

		// otherwise schema is a primitive value

		return nodeConfig.has(path) ? nodeConfig.get(path) : undefined;
	};

	const object = recursion(ConfigSchema, "");

	return ConfigSchema.parse(object);
};

const config = () => {
	if (!configCache) configCache = parseConfig();

	return configCache;
};

export { config };
