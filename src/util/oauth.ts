import OAuthServer from "@node-oauth/express-oauth-server";
import { OauthClient } from "../entity/oauthClient.js";
import { OauthToken } from "../entity/oauthToken.js";
import { type User } from "../entity/user.js";
import { FindOptionsWhere, MoreThan } from "typeorm";

export const Oauth = new OAuthServer({
	useErrorHandler: true,
	model: {
		async getClient(id, secret) {
			const where: FindOptionsWhere<OauthClient> = { id };
			if (secret) where["secret"] = secret;

			const client = await OauthClient.findOne({ where });

			if (!client) return null;

			return {
				id: client.id,
				grants: client.grants ?? [],
				redirectUris: client.redirectUris ?? undefined,
			};
		},

		async saveToken(token, client, user: User) {
			const opts = {
				user: user,
				client: { id: client.id },
				scopes: token.scope || [],
			};

			await OauthToken.create({
				type: "access",
				expires: token.accessTokenExpiresAt,
				value: token.accessToken,
				...opts,
			}).save();

			if (token.refreshToken) {
				await OauthToken.create({
					type: "refresh",
					expires: token.refreshTokenExpiresAt,
					value: token.refreshToken,
					...opts,
				}).save();
			}

			return {
				...token,
				user,
				client: {
					id: client.id,
					grants: client.grants ?? [],
					redirectUris: client.redirectUris ?? undefined,
				},
			};
		},

		async saveAuthorizationCode(code, client, user: User) {
			await OauthToken.create({
				type: "authorization",
				expires: code.expiresAt,
				value: code.authorizationCode,
				redirectUri: code.redirectUri,
				user: user,
				client: { id: client.id },
				scopes: code.scope || [],
				codeChallenge: code.codeChallenge ?? null,
				codeChallengeMethod: code.codeChallengeMethod ?? null,
			}).save();

			return {
				...code,
				user,
				client,
			};
		},

		async revokeAuthorizationCode(code) {
			const res = await OauthToken.delete({
				value: code.authorizationCode,
				type: "authorization",
			});

			return res.affected ? res.affected > 0 : false;
		},

		async revokeToken(token) {
			const res = await OauthToken.delete({
				value: token.refreshToken,
				type: "refresh",
			});

			return res.affected ? res.affected > 0 : false;
		},

		async getAccessToken(value) {
			const token = await OauthToken.findOne({
				where: { value, type: "access", expires: MoreThan(new Date()) },
				relations: { client: true, user: true },
			});
			if (!token) return null;

			return {
				accessToken: token.value,
				accessTokenExpiresAt: token.expires ?? undefined,
				scope: token.scopes,
				client: {
					id: token.client.id,
					grants: token.client.grants ?? [],
					redirectUris: token.client.redirectUris ?? undefined,
				},
				user: token.user,
			};
		},

		async getRefreshToken(value) {
			const token = await OauthToken.findOne({
				where: { value, type: "refresh", expires: MoreThan(new Date()) },
				relations: { client: true, user: true },
			});
			if (!token) return null;

			return {
				refreshToken: token.value,
				refreshTokenExpiresAt: token.expires ?? undefined,
				scope: token.scopes,
				client: {
					id: token.client.id,
					grants: token.client.grants ?? [],
					redirectUris: token.client.redirectUris ?? undefined,
				},
				user: token.user,
			};
		},

		async getAuthorizationCode(value) {
			const token = await OauthToken.findOne({
				where: { value, type: "authorization" },
				relations: { client: true, user: true },
			});
			if (!token || !token.redirectUri || !token.expires) return null;

			return {
				authorizationCode: token.value,
				expiresAt: token.expires ?? undefined,
				redirectUri: token.redirectUri,
				scope: token.scopes,
				client: {
					id: token.client.id,
					grants: token.client.grants ?? [],
					redirectUris: token.client.redirectUris ?? undefined,
				},
				user: token.user,
				codeChallenge: token.codeChallenge ?? undefined,
				codeChallengeMethod: token.codeChallengeMethod ?? undefined,
			};
		},
	},
});
