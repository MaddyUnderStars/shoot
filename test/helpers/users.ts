export const createTestUser = async (username: string) => {
	const { registerUser } = await import("../../src/util/entity/user");
	const { generateToken } = await import("../../src/util/token");
	const user = await registerUser(username, "password");
	return await generateToken(user.id);
};

export const createTestRemoteUser = async (name: string, domain: string) => {
	// haha
	const ap = JSON.parse(
		JSON.stringify(EXAMPLE_REMOTE_USER)
			.replaceAll("https://chat.understars.dev", domain)
			.replaceAll("REPLACED_NAME", name),
	);

	const { generateSigningKeys } = await import("../../src/util/entity/actor");
	const { createUserForRemotePerson } = await import(
		"../../src/util/entity/user"
	);

	const user = await createUserForRemotePerson(ap);

	await user.save();

	return await generateSigningKeys(user, true);
};

const EXAMPLE_REMOTE_USER = {
	"@context": [
		"https://www.w3.org/ns/activitystreams",
		"https://w3id.org/security/v1",
	],
	type: "Person",
	id: "https://chat.understars.dev/users/REPLACED_NAME",
	url: "https://chat.understars.dev/users/REPLACED_NAME",
	preferredUsername: "REPLACED_NAME",
	name: "REPLACED_NAME",
	published: "2024-05-29T09:49:47.254Z+0:00",
	inbox: "https://chat.understars.dev/users/REPLACED_NAME/inbox",
	outbox: "https://chat.understars.dev/users/REPLACED_NAME/outbox",
	followers: "https://chat.understars.dev/users/REPLACED_NAME/followers",
	following: "https://chat.understars.dev/users/REPLACED_NAME/following",
	endpoints: {
		sharedInbox: "https://chat.understars.dev/inbox",
	},
	publicKey: {
		id: "https://chat.understars.dev/users/REPLACED_NAME",
		owner: "https://chat.understars.dev/users/REPLACED_NAME",
		publicKeyPem:
			"-----BEGIN PUBLIC KEY-----\nMIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAyMZbCW8qFgEk9Y5ZZep6\nhuJTHTSdB554Fz5yjYcgp8oatNaul/Ex8a7aZVKEzkbHKjLfRWur9ulGMRMHWnpm\nJrjpBMafQKjt9+2Aoj4i++1t8rJMqUyYqfdOSJEWB5oHf5Xs34Y0CYXF6UxY9gm6\nIdF7lXccVZvyqNA8buyqSYqX545vMjEk/1yEQqXD/E76GhHVwnSAlipBkfAFFJ3H\nYQl+2nhyRZSEFfozj7zygLxMcwwLYBM28jVzi+/b6Jf3o4b+KU/pUueNjPW9r+i+\np3grPb8Ub/W6XtFuQJgcNI/C6cQIw6TbMRGnV5bLU1urFK+AUtqZBu3MF8wqFvAB\nXyUm6ceyXCYJJTGWPGBwotj9XjH2Ih9HTz1xWFFiRPjPvPlipuqdu6PB1qyD4HEZ\nVTpTSQaCHDlYGoPMPScBUK12CjqDUMak1FgE1Sx4nRMO/Hx6MGoauliAKVdlou/p\nhLIMnyHCyXWvSqYaQMN31pZkkI/2+CVCC3gcTnIaU2p9OWo65NoEzoG+yB9Jk/7T\nc8ZxAiAEd51VeWHwSj63hvBoUJE/E97Cu8Gc5p2bc6ac5Q6G0jkfWBtHGM34TQa0\nfu8YlbIr+DRD7wTGsPfSVEKLpKdJMvLxWHe7X42msK17yjjiehlNjaZa4RRzsOUZ\nVb6Ez4pWbTrCzN+Yg14sgLkCAwEAAQ==\n-----END PUBLIC KEY-----\n",
	},
};
