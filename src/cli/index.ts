import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

import { handleCli } from "./cli.js";

void handleCli(process.argv);
