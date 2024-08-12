import { z } from "zod";

export const IDENTIFY = z.object({
	/** User token to use to login */
	token: z.string(),
});

export const HEARTBEAT = z.object({
	s: z.number(),
});

export const SUBSCRIBE_MEMBERS = z.object({
	/** Channel mention to subscribe to */
	channel_id: z.string(),
	/** The range to subscribe to
	 * @example [0, 100]
	 */
	range: z.tuple([z.number(), z.number()]),
	/** Subscribe to only online members */
	online: z.boolean().nullable(),
});
