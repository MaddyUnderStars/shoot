import { writeFile } from "node:fs";
import path from "node:path";
import {
	extendZodWithOpenApi,
	OpenAPIRegistry,
	OpenApiGeneratorV31,
} from "@asteasolutions/zod-to-openapi";
import z from "zod";

extendZodWithOpenApi(z);

import { ConfigSchema } from "../util/ConfigSchema";

const registry = new OpenAPIRegistry();

registry.register("Config", ConfigSchema);

const generator = new OpenApiGeneratorV31(registry.definitions);

const document = generator.generateDocument({
	openapi: "3.1.0",
	info: {
		version: "1.0.0",
		title: "ConfigSchema",
	},
});

const configSchema = {
	$schema: "https://json-schema.org/draft/2020-12/schema",

	// biome-ignore lint/style/noNonNullAssertion: .
	...document.components!.schemas!.Config,
};

writeFile(
	path.join(__dirname, "..", "..", "assets", "config.json"),
	JSON.stringify(configSchema),
	{},
	(err) => {
		if (err) console.error(err);
		else {
			console.log("done");
			process.exit();
		}
	},
);
