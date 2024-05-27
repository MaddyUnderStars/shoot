export const createTestUser = async (username: string) => {
	const { registerUser, generateToken } = await import("../../src/util");
	const user = await registerUser(username, "password", undefined, true);
	return await generateToken(user.id);
};
