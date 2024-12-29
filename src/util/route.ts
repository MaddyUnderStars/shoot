import type { NextFunction, Request, RequestHandler, Response } from "express";
import { type ZodError, type ZodSchema, z } from "zod";

export type RouteOptions<TParams, TResponse, TBody, TQuery> = {
	params?: ZodSchema<TParams>;
	query?: ZodSchema<TQuery>;
	body?: ZodSchema<TBody>;
	response?: ZodSchema<TResponse>;
	summary?: string;
	errors?: Record<number, ZodSchema>;
};

type ErrorItem = {
	type: "Query" | "Params" | "Body";
	errors: ZodError<unknown>;
};

const ZodHttpError = z
	.object({
		message: z.string(),
		code: z.number(),
	})
	.openapi("HttpError");

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
		const errors: ErrorItem[] = [];

		if (req.params && opts.params) {
			const ret = opts.params.safeParse(req.params);
			if (ret.error) errors.push({ type: "Params", errors: ret.error });
			if (ret.data) req.params = ret.data;
		}

		if (req.query && opts.query) {
			const ret = opts.query.safeParse(req.query);
			if (ret.error) errors.push({ type: "Query", errors: ret.error });
			if (ret.data) req.query = ret.data;
		}

		if (req.body && opts.body) {
			const ret = opts.body.safeParse(req.body);
			if (ret.error) errors.push({ type: "Body", errors: ret.error });
			if (ret.data) req.body = ret.data;
		}

		if (errors.length > 0) {
			res.status(400).send(
				errors.map((x) => ({ type: x.type, errors: x.errors })),
			);
		}

		return next();
	};
};

export const route = <Params, Response, Body, Query>(
	opts: RouteOptions<Params, Response, Body, Query>,
	handler: RequestHandler<Params, Response, Body, Query>,
) => {
	opts.errors = opts.errors ?? {};
	opts.errors[401] = opts.errors[401] ?? ZodHttpError;
	opts.errors[404] = opts.errors[404] ?? ZodHttpError;
	opts.errors[404] = opts.errors[400] ?? ZodHttpError;
	opts.errors[500] = opts.errors[500] ?? ZodHttpError;

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
