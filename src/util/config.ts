// import nodeConfig from "config";
import type z from "zod";
import type { AnyZodObject } from "zod";
import { ConfigSchema } from "./ConfigSchema";
import { createLogger } from "./log";

const Log = createLogger("config");

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
