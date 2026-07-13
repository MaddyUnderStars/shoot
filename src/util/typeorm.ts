// have to call this here for typeorm cli
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

import { getDatasource } from "./datasource.js";

const DATASOURCE_OPTIONS = getDatasource();

export default DATASOURCE_OPTIONS;
