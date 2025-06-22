import type { ErrorRequestHandler } from "express";
import z from "zod";
import { InstanceBlockedError } from "../../util/activitypub/instances";
import { HttpError } from "../../util/httperror";
import { createLogger } from "../../util/log";

const ENTITY_NOT_FOUND_REGEX = /"(\w+)"/;

const Log = createLogger("HTTP");

export const errorHandler: ErrorRequestHandler = (error, req, res, next) => {
	if (res.headersSent) return next(error);

	let code = 400;
	let message: string = error.message;

	switch (true) {
		case error instanceof InstanceBlockedError:
			// TODO: I'd prefer to shadow ban i.e. send them a response as if it worked normally
			code = 401;
			message = "Unauthorised";
			break;
		case error instanceof SyntaxError:
			// silence
			break;
		case error instanceof HttpError:
			code = error.code;
			break;
		case error instanceof z.ZodError:
			message = error.errors[0].message;
			break;
		case error.name === "EntityNotFoundError": {
			code = 404;
			const name =
				error.message.match(ENTITY_NOT_FOUND_REGEX)?.[1] || "Object";
			message = `${name} could not be found`;
			break;
		}
		case error.name === "QueryFailedError":
			code = 500;

			if (error.message.toLowerCase().includes("unique")) {
				code = 400;
				message = "Object already exists";
			}
			break;
		case error.message === "fetch failed":
			code = 500;
			message =
				error?.cause?.errors?.[0]?.message ||
				error?.cause?.message ||
				error.message;
			break;
		case "$metadata" in error: {
			// aws s3 client error
			code = 500;
			message =
				"$response" in error
					? error.$response.reason
					: "Internal server error";
			break;
		}
		default:
			Log.error(error);
			break;
	}

	return res.status(code).json({ code, message });
};
