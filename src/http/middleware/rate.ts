import rateLimit from "express-rate-limit";
import { config } from "../../util";

export const rateLimiter = (
	type: "s2s" | "auth" | "nodeinfo" | "wellknown" | "global",
) => {
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
