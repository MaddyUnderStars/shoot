export const tryParseUrl = (input: any) => {
	try {
		return new URL(input);
	}
	catch (e) {
		return null;
	}
}