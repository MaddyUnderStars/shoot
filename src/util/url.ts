import { config } from "./config";

export const tryParseUrl = (input: string | URL) => {
	if (input instanceof URL) return input;

	try {
		return new URL(input);
	} catch (_) {
		return null;
	}
};

export const makeUrl = (path: string, base: URL) => {
	const url = new URL(base);

	if (path.startsWith("/")) path = path.slice(1);

	url.pathname = `${url.pathname}${url.pathname.endsWith("/") ? "" : "/"}${path}`;

	return url;
};

/**
 * Appends a path to the instance URL
 */
export const makeInstanceUrl = (path: string) => {
	return makeUrl(path, config().federation.instance_url).href;
};

/**
 * Appends a path to the webapp URL
 */
export const makeWebappUrl = (path: string) => {
	return makeUrl(path, config().federation.webapp_url).href;
};
