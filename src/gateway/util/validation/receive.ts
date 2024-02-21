import { z } from "zod";

export const IDENTIFY = z.object({
	/** User token to use to login */
	token: z.string(),
});
