import { HttpError } from "../httperror";

export class APError extends HttpError {
	public remoteResponse: unknown;

	constructor(message: string, code = 400, remoteResponse?: unknown) {
		super(message, code);
		this.remoteResponse = remoteResponse;
	}
}
