import { RequestHandler } from "express";
import { HttpError, getUserFromToken } from "../../util";

const NO_AUTH_ROUTES = ["/auth/login", "/auth/register", /\.well\-known/];

export const authHandler: RequestHandler = async (req, res, next) => {
	const url = req.url;

	if (
		NO_AUTH_ROUTES.some((x) => {
			if (typeof x == "string") return url.startsWith(x);
			return x.test(url);
		})
	)
		return next();

	const { authorization } = req.headers;
	if (!authorization)
		throw new HttpError("Missing `authorization` header", 401);

	let user;
	try {
		user = await getUserFromToken(authorization);
	} catch (e) {
		return next(e);
	}

	req.user_id = user.id;

	return next();
};

declare global {
	namespace Express {
		interface Request {
			user_id: string;
		}
	}
}
