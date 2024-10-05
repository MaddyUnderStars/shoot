import rateLimit, { type RateLimitRequestHandler } from "express-rate-limit";
import { config } from "../../util";

const NONE: RateLimitRequestHandler = (req, res, next) => {
	return next();
};

NONE.resetKey = () => undefined;
NONE.getKey = (key: string) => undefined;

export const rateLimiter = (
	type: "s2s" | "auth" | "nodeinfo" | "wellknown" | "global",
): RateLimitRequestHandler => {
	if (!config.http.rate) return NONE;

	return rateLimit({
		windowMs: config.http.rate[type].window,
		limit: config.http.rate[type].limit,
		standardHeaders: "draft-7",
		message: () => ({ code: 429, message: "Too many requests" }),
		keyGenerator: (req) => {
			return req.user
				? `${type}-${req.user.id}-${req.ip}`
				: `${type}-${req.ip}`;
		},
	});
};
