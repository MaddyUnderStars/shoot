import { ErrorRequestHandler } from "express";
import z from "zod";
import { HttpError } from "../../util";

const ENTITY_NOT_FOUND_REGEX = /"(\w+)"/;
const ENTITY_EXISTS_REGEX = /(\w+)\./;

export const errorHandler: ErrorRequestHandler = (error, req, res, next) => {
	if (res.headersSent) return next(error);

	let code = 400;
	let message: string = error.message;

	if (error instanceof HttpError) code = error.code;
	else if (error instanceof z.ZodError) message = error.errors[0].message;
	else if (error.name === "EntityNotFoundError") {
		code = 404;
		const name = error.message.match(ENTITY_NOT_FOUND_REGEX)?.[1] || "Object";
		message = `${name} could not be found`
	}
	else if (error.name === "QueryFailedError") {
		code = 500;

		if (error.message.toLowerCase().includes("unique")) {
			code = 400;
			message = `Object already exists`
		}
	}

	return res.status(code).json({ code, message });
};
