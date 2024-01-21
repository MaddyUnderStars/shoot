import {
	OpenAPIRegistry,
	OpenApiGeneratorV3,
	extendZodWithOpenApi,
} from "@asteasolutions/zod-to-openapi";
import { Router } from "express";

import { writeFileSync } from "fs";
import path from "path";
import { AnyZodObject, z } from "zod";

extendZodWithOpenApi(z);

import apiRoutes from "../http/api";
import activitypubRoutes from "../http/s2s";

const getRoutes = (router: Router) => {
	const convertRegexToPath = (regexp: RegExp, keys: any[]) => {
		return regexp
			.toString()
			.replaceAll("/^", "")
			.replaceAll("\\/", "/")
			.replaceAll("\\.", ".")
			.replaceAll("/?(?=/|$)", "")
			.replaceAll("/i", "")
			.replaceAll("(?:([^/]+?))", () => "{" + keys.shift().name + "}");
	};

	const _getRoutes = (router: Router, prefix = "") => {
		let ret: Array<{
			path: string;
			method: Method;
			options: {
				params: AnyZodObject;
				body: AnyZodObject;
				query: AnyZodObject;
				response: AnyZodObject;
			};
		}> = [];

		for (const layer of router.stack as Layer[]) {
			if (layer.name != "router" && layer.name != "bound dispatch")
				continue;

			if (layer.handle.name == "router") {
				ret.push(
					..._getRoutes(
						layer.handle,
						convertRegexToPath(layer.regexp, layer.keys),
					),
				);
				continue;
			}

			ret.push({
				path: prefix + layer.route.path,
				method: Object.entries(layer.route.methods)[0][0] as Method,
				// TODO: this will probably break
				options: layer.route.stack[0].handle.ROUTE_OPTIONS,
			});
		}

		return ret;
	};

	const ret = _getRoutes(router);
	return ret;
};

const generateOpenapi = (router: Router, requestContentType: string) => {
	const registry = new OpenAPIRegistry();

	const routes = getRoutes(router);

	for (const route of routes) {
		registry.registerPath({
			method: route.method,
			path: route.path,
			summary: "",
			request: {
				params: route.options.params,
				body: route.options.body
					? {
							content: {
								requestContentType: {
									schema: route.options.body,
								},
							},
						}
					: undefined,
				query: route.options.query,
			},
			responses: {
				"200": {
					description: "",
					content: {
						"application/json": {
							schema: route.options.response ?? z.object({}),
						},
					},
				},
			},
		});
	}

	const generator = new OpenApiGeneratorV3(registry.definitions);

	return generator.generateDocument({
		openapi: "3.0.0",
		info: {
			version: "1.0.0",
			title: "Client to Server API",
		},
		servers: [{ url: "https://chat.understars.dev" }],
	});
};

let document = generateOpenapi(apiRoutes, "application/json");
writeFileSync(
	path.join(__dirname, "..", "..", "assets", "client.json"),
	JSON.stringify(document),
);

document = generateOpenapi(activitypubRoutes, "application/activity+json");
writeFileSync(
	path.join(__dirname, "..", "..", "assets", "activitypub.json"),
	JSON.stringify(document),
);

// Internal express types that don't get exposed because they hate me :(
type Key = {
	name: string;
	offset: number;
	optional: boolean;
};

type Route = {
	path: string;
	methods: { [key: string]: boolean };
	stack: Layer[];
};

type Layer = {
	handle: any;
	keys: Key[];
	name: string;
	path: unknown;
	regexp: RegExp;
	route: Route;
};

type Method =
	| "get"
	| "post"
	| "put"
	| "delete"
	| "patch"
	| "head"
	| "options"
	| "trace";
