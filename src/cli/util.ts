import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { merge } from "ts-deepmerge";
import type { DeepPartial } from "typeorm";
import type { config } from "../util";

export const appendToConfig = async <T extends DeepPartial<typeof config>>(
	obj: T,
	file = "./config/default.json",
) => {
	let existing: string | undefined = undefined;
	try {
		existing = (await readFile(file)).toString();
	} catch (e) {}

	const existingConfig = existing ? JSON.parse(existing) : {};

	await mkdir(dirname(file), { recursive: true });
	await writeFile(file, JSON.stringify(merge(existingConfig, obj), null, 2));
};
