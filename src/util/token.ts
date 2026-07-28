import { User } from "../entity/user.js";
import { HttpError } from "./httperror.js";
import { Oauth } from "./oauth.js";

const INVALID_TOKEN = new HttpError("Invalid token", 401);

export type UserTokenData = {
	id: string;
	iat: number;
};

export const getUserFromToken = async (token: string): Promise<User> => {
	let accessToken = await Oauth.server.options.model.getAccessToken(token);

	if (!accessToken) throw INVALID_TOKEN;

	if (!(accessToken.accessTokenExpiresAt instanceof Date)) {
		throw INVALID_TOKEN;
	}

	if (accessToken.accessTokenExpiresAt < new Date()) {
		throw INVALID_TOKEN;
	}

	return accessToken.user as User;
};
