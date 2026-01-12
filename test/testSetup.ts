import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

import { vi } from "vitest";
import { ConfigSchema } from "../src/util/ConfigSchema";

vi.mock(import("../src/util/config"), () => {
	return {
		config: () => {
			return ConfigSchema.parse(
				JSON.parse(process.env.NODE_CONFIG as string),
			);
		},
	};
});
