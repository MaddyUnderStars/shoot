import { handleCli } from "../../src/cli/cli";
import { test } from "../fixture";

test("CLI can create user", async ({ expect, dbClient }) => {
	expect(
		await handleCli([
			"node",
			process.cwd(),
			"add-user",
			"testUser",
			"test@localhost",
		]),
	).not.toBeInstanceOf(Error);

	const res = await dbClient.query("SELECT * FROM users WHERE name = $1", [
		"testUser",
	]);

	const user = res.rows[0];

	expect({
		...user,
		password_hash: null,
		id: null,
		created_date: null,
		valid_tokens_since: null,
	}).toMatchSnapshot();
});
