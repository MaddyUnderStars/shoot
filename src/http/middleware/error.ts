import { ErrorRequestHandler } from "express";
import z from "zod";
import { HttpError, createLogger } from "../../util";

const ENTITY_NOT_FOUND_REGEX = /"(\w+)"/;

const Log = createLogger("HTTP")

export const errorHandler: ErrorRequestHandler = (error, req, res, next) => {
	if (res.headersSent) return next(error);

	let code = 400;
	let message: string = error.message;

	// TODO: configure
	Log.error(error);

	switch (true) {
		case error instanceof HttpError:
			code = error.code
			break;
		case error instanceof z.ZodError:
			message = error.errors[0].message;
			break;
		case error.name === "EntityNotFoundError":
			code = 404;
			const name = error.message.match(ENTITY_NOT_FOUND_REGEX)?.[1] || "Object";
			message = `${name} could not be found`
		case error.name === "QueryFailedError":
			code = 500;

			if (error.message.toLowerCase().includes("unique")) {
				code = 400;
				message = `Object already exists`
			}
		case error.message === "fetch failed":
			code = 500;
			message = error?.cause?.errors?.[0]?.message || error?.cause?.message || error.message;
	}

	return res.status(code).json({ code, message });
};
