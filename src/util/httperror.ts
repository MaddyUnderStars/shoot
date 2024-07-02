export class HttpError extends Error {
	constructor(
		public message: string,
		public code = 404,
	) {
		super(message);
	}
}
