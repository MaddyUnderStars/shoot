import { RequestHandler } from "express";
import { RequestValidation, validateRequest } from "zod-express-middleware";

export const route = <Params, Response, Body, Query>(
	opts: RequestValidation<Params, Query, Body>,
	handler: RequestHandler<Params, Response, Body, Query>,
) => {
	const ret: RequestHandler<Params, Response, Body, Query> = (
		req,
		res,
		next,
	) => {
		return validateRequest(opts).call(this, req, res, async () => {
			try {
				return await handler.call(this, req, res, next);
			} catch (e) {
				next(e);
			}
		});
	};

	return ret;
};
