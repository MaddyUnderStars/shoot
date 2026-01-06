// have to call this here for typeorm cli
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

import path from "node:path";
import { DataSource } from "typeorm";
import { config } from "./config";

const CONNECTION_STRING = config().database.url;
const CONNECTION_TYPE = CONNECTION_STRING.replace(
	// standardise so our migrations folder works
	"postgresql://",
	"postgres://",
)
	.split("://")?.[0]
	?.replace("+src", "");
const IS_SQLITE = CONNECTION_TYPE === "sqlite";

const DATASOURCE_OPTIONS = new DataSource({
	//@ts-expect-error
	type: CONNECTION_TYPE,
	url: IS_SQLITE ? undefined : CONNECTION_STRING,
	database: IS_SQLITE ? CONNECTION_STRING.split("://")[1] : undefined,
	supportBigNumbers: true,
	bigNumberStrings: false,
	synchronize: false, // TODO
	logging: config().database.log,

	// these reference js files because they are done at runtime, and we compile
	// it'll break if you run Shoot under ts-node or tsx or whatever
	entities: [path.join(__dirname, "..", "entity", "*.js")],
	migrations: [path.join(__dirname, "migration", CONNECTION_TYPE, "*.js")],
});

export default DATASOURCE_OPTIONS;
