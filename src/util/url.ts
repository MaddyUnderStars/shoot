export const tryParseUrl = (input: string) => {
	try {
		return new URL(input);
	} catch (e) {
		return null;
	}
};
