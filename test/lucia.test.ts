import { describe, expect, test } from "bun:test";
import { databaseUser, testAdapter } from "@lucia-auth/adapter-test";
import Surreal, { RecordId, surql, surrealql } from "@surrealdb/surrealdb";
import { SurrealDBLuciaAdapter } from "../src/index.ts";

const {
	LUCIA_TEST_URL = "ws://127.0.0.1:8000/rpc",
	LUCIA_TEST_USER = "root",
	LUCIA_TEST_PASS = "root",
	LUCIA_TEST_NS = "lucia_internal_test_ns",
	LUCIA_TEST_DB = "lucia_internal_test_db",
	LUCIA_TEST_SESSION_TABLE = "session_table",
	LUCIA_TEST_USER_TABLE = "user_table",
} = process.env;

const db = new Surreal();

try {
	await db.connect(LUCIA_TEST_URL, { versionCheck: false });
	await db.use({
		namespace: LUCIA_TEST_NS,
		database: LUCIA_TEST_DB,
	});
	await db.signin({
		username: LUCIA_TEST_USER,
		password: LUCIA_TEST_PASS,
	});
} catch (error) {
	console.error({ errorDBInit: error });
}

const lucia_user_rid = new RecordId(LUCIA_TEST_USER_TABLE, databaseUser.id);
const lucia_user_username = databaseUser.attributes.username;
const create_lucia_user = surrealql`CREATE ${lucia_user_rid} SET username = ${lucia_user_username};`;

await db.query(create_lucia_user);

const adapter = new SurrealDBLuciaAdapter(db, {
	sessionTableName: LUCIA_TEST_SESSION_TABLE,
	userTableName: LUCIA_TEST_USER_TABLE,
});

describe("lucia-auth", () => {
	test("internal tests", async () => {
		let done = false;
		try {
			await testAdapter(adapter);
			done = true;
		} catch (error) {
			console.error({ lucia_internal_tests_errors: error });
			done = false;
		}
		expect(done).toBe(true);
	});
});

declare module "lucia" {
	interface Register {
		DatabaseUserAttributes: {
			username: string;
		};
		DatabaseSessionAttributes: {
			alias: string;
			os: string;
		};
	}
}
