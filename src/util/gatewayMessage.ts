import { z } from "zod";

export const MESSAGE_CREATE = z.object({
	op: z.literal("MESSAGE_CREATE"),
	data: z.object({
		content: z.string(),
	}),
});
