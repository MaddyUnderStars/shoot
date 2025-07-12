import type { NextFunction, Request, RequestHandler, Response } from "express";
import { type ZodError, type ZodSchema, z } from "zod";

// parseRequests adapted from https://github.com/Aquila169/zod-express-middleware/tree/main
// MIT license 2021 Casper Schouls
const parseRequest = <TParams, TResponse, TBody, TQuery>(
	opts: RouteOptions<TParams, TResponse, TBody, TQuery>,
) => {
	return (
		req: Request<TParams, TResponse, TBody, TQuery>,
		res: Response,
		next: NextFunction,
	) => {
		const errors: ValidationErrors = {};

		if (req.params && opts.params) {
			const ret = opts.params.safeParse(req.params);
			if (ret.error) errors.param = ret.error;
			if (ret.data) req.params = ret.data;
		}

		if (req.query && opts.query) {
			const ret = opts.query.safeParse(req.query);
			if (ret.error) errors.query = ret.error;
			if (ret.data) req.query = ret.data;
		}

		if (req.body && opts.body) {
			const ret = opts.body.safeParse(req.body);
			if (ret.error) errors.body = ret.error;
			if (ret.data) req.body = ret.data;
		}

		if (Object.keys(errors).length > 0) throw new ValidationError(errors);

		return next();
	};
};

export const route = <Params, Response, Body, Query>(
	opts: RouteOptions<Params, Response, Body, Query>,
	handler: RequestHandler<Params, Response, Body, Query>,
) => {
	// these errors are generally always present. see error middleware
	opts.errors = opts.errors ?? {};
	// 400 is triggered for any zod validation errors
	opts.errors[400] = opts.errors[400] ?? true;
	// 401 is triggered for invalid auth token
	opts.errors[401] = opts.errors[401] ?? true;
	// 404 is triggered for any typeorm findOneOrFail failures
	opts.errors[404] = opts.errors[404] ?? true;
	// 500 is triggered for a bunch of stuff. see error.ts middleware
	opts.errors[500] = opts.errors[500] ?? true;

	const ret: RequestHandler<Params, Response, Body, Query> = (
		req,
		res,
		next,
	) => {
		return parseRequest(opts).call(this, req, res, async () => {
			try {
				// The handler may be async, so this await is required
				return await handler.call(this, req, res, next);
			} catch (e) {
				next(e);
			}
		});
	};

	// For openapi generation
	Object.assign(ret, { ROUTE_OPTIONS: opts });

	return ret;
};

export type RouteOptions<TParams, TResponse, TBody, TQuery> = {
	params?: ZodSchema<TParams>;
	query?: ZodSchema<TQuery>;
	body?: ZodSchema<TBody>;
	/**
	 * 200 response
	 */
	response?: ZodSchema<TResponse>;
	summary?: string;
	/**
	 * non-200 response codes
	 * if `true` specified, use default schema for that code if available
	 */
	errors?: Record<number, ZodSchema | true>;
};

export class ValidationError extends Error {
	constructor(public issues: ValidationErrors) {
		super("validation error");
	}
}

enum ErrorTypes {
	Body = "body",
	Param = "param",
	Query = "query",
}

type ValidationErrors = Partial<{
	[type in ErrorTypes]: ZodError<unknown>;
}>;

export const ZodHttpError = z
	.object({
		message: z.string(),
		code: z.number(),
		detail: z
			.record(
				z.nativeEnum(ErrorTypes),
				z.array(
					z.object({
						// zod doesn't expose the error type as a schema itself
						// which is unfortunate, because I'm not going to maintain that
						// but that does mean this schema does not include all properties
						// TODO: I could make my own type and transform them into it so the schema is right
						// but I don't want to right now
						message: z.string(),
						code: z.string(),
						path: z.string().array(),
					}),
				),
			)
			.optional(),
	})
	.openapi("HttpError");
