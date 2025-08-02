import { writeFile } from "node:fs";
import path from "node:path";
import {
	extendZodWithOpenApi,
	OpenAPIRegistry,
	OpenApiGeneratorV31,
} from "@asteasolutions/zod-to-openapi";
import type { Router } from "express";
import { type AnyZodObject, z } from "zod";

extendZodWithOpenApi(z);

process.env.NODE_CONFIG = JSON.stringify({
	database: {
		url: "postgres://127.0.0.1",
	},
	security: {
		jwt_secret: "a",
	},
});

import apiRoutes from "../http/api";
import { NO_AUTH_ROUTES } from "../http/middleware/auth";
import { ZodHttpError } from "../util/route";

const getRoutes = (router: Router) => {
	const convertRegexToPath = (regexp: RegExp, keys: { name: string }[]) => {
		return regexp
			.toString()
			.replaceAll("/^", "")
			.replaceAll("\\/", "/")
			.replaceAll("\\.", ".")
			.replaceAll("/?(?=/|$)", "")
			.replace(/\/i$/, "")
			.replaceAll("(?:/([^/]+?))", () => `/{${keys.shift()?.name}}`);
	};

	const _getRoutes = (router: Router, prefix = "") => {
		const ret: Array<{
			path: string;
			method: Method;
			requires_auth: boolean;
			options?: {
				params: AnyZodObject;
				body: AnyZodObject;
				query: AnyZodObject;
				response: AnyZodObject;
				errors: Record<number, AnyZodObject>;
			};
		}> = [];

		for (const layer of router.stack) {
			if (layer.name !== "router" && layer.name !== "bound dispatch")
				continue;

			if (layer.handle.name === "router") {
				ret.push(
					..._getRoutes(
						//@ts-ignore
						layer.handle,
						//@ts-ignore
						convertRegexToPath(layer.regexp, layer.keys),
					),
				);
				continue;
			}

			if (!layer.route) continue;

			layer.route.path = layer.route.path.replaceAll(
				/:(\w*)($|\/)/gm,
				(_, a) => {
					return `{${a}}`;
				},
			);

			ret.push({
				path: prefix + layer.route.path,
				//@ts-ignore
				method: Object.entries(layer.route.methods)[0][0] as Method,
				// TODO: this will probably break
				//@ts-ignore
				options: layer.route.stack[0].handle.ROUTE_OPTIONS,

				requires_auth: !NO_AUTH_ROUTES.some((x) => {
					if (typeof x === "string")
						return (prefix + layer.route?.path).startsWith(x);
					return x.test(prefix + layer.route?.path);
				}),
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

	const bearerAuth = registry.registerComponent(
		"securitySchemes",
		"bearerAuth",
		{
			type: "http",
			scheme: "bearer",
			bearerFormat: "JWT",
		},
	);

	const innerErrorResponse = {
		content: {
			"application/json": {
				schema: {
					$ref: "#/components/schemas/HttpError",
				},
			},
		},
	};

	registry.registerComponent("responses", "BadRequest", {
		description: "Bad request",
		...innerErrorResponse,
	});

	registry.registerComponent("responses", "NotFound", {
		description: "The requested resource was not found",
		...innerErrorResponse,
	});

	registry.registerComponent("responses", "Unauthorised", {
		description: "Unauthorised",
		...innerErrorResponse,
	});

	registry.registerComponent("responses", "InternalServerError", {
		description: "Internal server error",
		...innerErrorResponse,
	});

	registry.register("HttpError", ZodHttpError);

	const errorMap = {
		"400": "BadRequest",
		"404": "NotFound",
		"401": "Unauthorised",
		"500": "InternalServerError",
	} as const;

	for (const route of routes) {
		registry.registerPath({
			method: route.method,
			path: route.path,
			security: route.requires_auth
				? [{ [bearerAuth.name]: [] }]
				: undefined,
			tags: [route.path.split("/")[1]],
			request: {
				params: route.options?.params,
				// headers: z.object({
				// "content-type": z.literal("application/json"),
				// }),
				body: route.options?.body
					? {
							content: {
								[requestContentType]: {
									schema: route.options?.body,
								},
							},
						}
					: undefined,
				query: route.options?.query,
			},
			responses: {
				"200": {
					description: route.options?.response?.description ?? "",
					content: {
						"application/json": {
							schema: route.options?.response ?? z.object({}),
						},
					},
				},
				...Object.fromEntries(
					Object.entries(route.options?.errors ?? {}).map(
						([code, schema]) => {
							// christ
							// why can't `x in errorMap` do this automatically?
							if (
								((x): x is keyof typeof errorMap =>
									x in errorMap)(code)
							) {
								// if we have a common response for this
								// just reference it instead

								return [
									code,
									{
										$ref: `#/components/responses/${errorMap[code]}`,
									},
								];
							}

							return [
								code,
								{
									description: schema?.description ?? "",
									content: {
										"application/json": {
											schema: schema ?? z.object({}),
										},
									},
								},
							];
						},
					),
				),
			},
		});
	}

	const generator = new OpenApiGeneratorV31(registry.definitions);

	return generator.generateDocument({
		openapi: "3.1.0",
		info: {
			version: "1.0.0",
			title: "Client to Server API",
		},
		servers: [{ url: "https://chat.understars.dev" }],
	});
};

const document = generateOpenapi(apiRoutes, "application/json");
writeFile(
	path.join(__dirname, "..", "..", "..", "assets", "client.json"),
	JSON.stringify(document),
	{},
	(err) => {
		if (err) console.error(err);
		else {
			console.log("done");
			process.exit();
		}
	},
);

// document = generateOpenapi(activitypubRoutes, "application/activity+json");
// writeFileSync(
// 	path.join(__dirname, "..", "..", "assets", "activitypub.json"),
// 	JSON.stringify(document),
// );

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
	handle: unknown;
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
