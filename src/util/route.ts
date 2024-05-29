import { RequestHandler } from "express";
import { ZodSchema } from "zod";
import { RequestValidation, validateRequest } from "zod-express-middleware";

export type RouteOptions<Params, Response, Body, Query> = RequestValidation<
	Params,
	Query,
	Body
> & {
	response?: ZodSchema<Response>;
};

export const route = <Params, Response, Body, Query>(
	opts: RouteOptions<Params, Response, Body, Query>,
	handler: RequestHandler<Params, Response, Body, Query>,
) => {
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
