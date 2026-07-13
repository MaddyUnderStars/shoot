// Entrypoint for preloading @asteasolutions/zod-to-openapi

import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);
