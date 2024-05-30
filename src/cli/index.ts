import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
extendZodWithOpenApi(z);

import { closeDatabase } from "../util";
import { handleCli } from "./cli";

handleCli(process.argv).then(() => closeDatabase());
