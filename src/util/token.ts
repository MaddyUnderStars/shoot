import jwt from "jsonwebtoken";
import { User } from "../entity/user";
import { config } from "./config";
import { HttpError } from "./httperror";

const INVALID_TOKEN = new HttpError("Invalid token", 401);

export type UserTokenData = {
	id: string;
	iat: number;
};

export const getUserFromToken = (token: string): Promise<User> =>
	new Promise((resolve, reject) => {
		token = token.replace("Bearer ", "");

		jwt.verify(
			token,
			config.security.jwt_secret,
			{
				algorithms: ["HS256"],
			},
			async (err, out) => {
				const decoded = out as UserTokenData;
				if (err || !decoded) return reject(INVALID_TOKEN);

				const user = await User.findOne({
					where: { id: decoded.id },
				});

				if (!user || !user.valid_tokens_since)
					return reject(INVALID_TOKEN);

				if (
					decoded.iat * 1000 <
					new Date(user.valid_tokens_since).setSeconds(0, 0)
				)
					return reject(INVALID_TOKEN);

				return resolve(user);
			},
		);
	});

export const generateToken = (id: string): Promise<string> => {
	const iat = Math.floor(Date.now() / 1000);
	const algorithm = "HS256";

	return new Promise((res, rej) =>
		jwt.sign(
			{ id, iat } as UserTokenData,
			config.security.jwt_secret,
			{ algorithm },
			(err, token) => {
				if (err || !token) return rej(err);
				return res(token);
			},
		),
	);
};
