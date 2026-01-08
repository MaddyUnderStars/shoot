// have to call this here for typeorm cli
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { getDatasource } from "./datasource";

extendZodWithOpenApi(z);

const DATASOURCE_OPTIONS = getDatasource();

export default DATASOURCE_OPTIONS;
