import type { RequestHandler } from "express";
import { type ZodSchema, z } from "zod";
import {
	type RequestValidation,
	validateRequest,
} from "zod-express-middleware";

export type RouteOptions<Params, Response, Body, Query> = RequestValidation<
	Params,
	Query,
	Body
> & {
	response?: ZodSchema<Response>;
	summary?: string;
	errors?: Record<number, ZodSchema>;
};

const ZodHttpError = z
	.object({
		message: z.string(),
		code: z.number(),
	})
	.openapi("HttpError");

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
		return validateRequest(opts).call(this, req, res, async () => {
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
