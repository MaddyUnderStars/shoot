import jwt from "jsonwebtoken";
import { User } from "../entity";
import { config } from "./config";

const INVALID_TOKEN = "Invalid token";

export type UserTokenData = {
	id: string;
	iat: number;
}

export const getUserFromToken = (token: string): Promise<User> =>
	new Promise((resolve, reject) => {
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

				if (!user) return reject(INVALID_TOKEN);

				if (decoded.iat * 1000 < new Date(user.valid_tokens_since!).setSeconds(0, 0))
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
