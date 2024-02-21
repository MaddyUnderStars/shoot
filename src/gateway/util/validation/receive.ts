import { z } from "zod";

export const IDENTIFY = z.object({
	/** User token to use to login */
	token: z.string(),
});

export const HEARTBEAT = z.object({
	s: z.number(),
});
