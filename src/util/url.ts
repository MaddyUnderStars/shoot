import { config } from "./config";

export const tryParseUrl = (input: string) => {
	try {
		return new URL(input);
	} catch (e) {
		return null;
	}
};

const makeUrl = (path: string, base: URL) => {
	const url = new URL(base);

	if (path.startsWith("/")) path = path.slice(1);

	url.pathname = `${url.pathname}${url.pathname.endsWith("/") ? "" : "/"}${path}`;

	return url.href;
};

/**
 * Appends a path to the instance URL
 */
export const makeInstanceUrl = (path: string) => {
	return makeUrl(path, config.federation.instance_url);
};

/**
 * Appends a path to the webapp URL
 */
export const makeWebappUrl = (path: string) => {
	return makeUrl(path, config.federation.webapp_url);
};
