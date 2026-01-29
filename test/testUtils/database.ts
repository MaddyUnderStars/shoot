import { Client as PgClient } from "pg";
import { inject } from "vitest";

export const createTestDatabase = async () => {
	const postgres = inject("POSTGRES_AUTH");

	const client = new PgClient(postgres);

	await client.connect();

	const name = `shoot_${Math.random().toString().split(".")[1]}`;
	await client.query(`CREATE DATABASE ${name}`);

	await client.end();

	return name;
};
