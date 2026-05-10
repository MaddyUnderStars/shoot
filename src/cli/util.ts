import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { merge } from "ts-deepmerge";
import type { DeepPartial } from "typeorm";
import type { config } from "../util/config";

export const appendToConfig = async (
	obj: DeepPartial<typeof config>,
	file = "./config/default.json",
) => {
	let existing: string | undefined;
	try {
		existing = (await readFile(file)).toString();
	} catch {}

	const existingConfig = existing ? JSON.parse(existing) : {};

	await mkdir(dirname(file), { recursive: true });
	await writeFile(file, JSON.stringify(merge(existingConfig, obj), null, 2));
};
