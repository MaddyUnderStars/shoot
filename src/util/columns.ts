import { ValueTransformer } from "typeorm";

export const UrlTransformer: ValueTransformer = {
	from(value: string | null) {
		if (!value) return null;
		try {
			return new URL(value);
		} catch {
			return value;
		}
	},
	to(value: URL | string | null) {
		return value?.toString() || null;
	},
};
