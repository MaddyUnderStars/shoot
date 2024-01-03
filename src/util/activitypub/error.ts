import { HttpError } from "../httperror";

export class APError extends HttpError {
	constructor(message: string, code = 400) {
		super(message, code);
	}
 }
