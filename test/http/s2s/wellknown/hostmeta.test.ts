import request from "supertest";
import { test } from "../../../fixture";

test("Hostmeta responds 200", async ({ api, expect }) => {
	const res = await request(api.app)
		.get("/.well-known/host-meta")
		.expect(200);

	expect(res.body).toMatchSnapshot();
});
