import { expect, test, describe, beforeAll, afterAll } from "bun:test";
import { Surreal, Table } from "surrealdb.js";
import { surrealql } from "surrealdb.js";
import { SurrealDBLuciaAdapter } from "../src/index.ts";
import { databaseUser } from "@lucia-auth/adapter-test";
import type { SurrealUser, SurrealSession } from "../src/types.ts";

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

const {
  SURREALDB_TEST_URL = "ws://127.0.0.1:8000/rpc",
  SURREALDB_TEST_USER = "root",
  SURREALDB_TEST_PASS = "root",
  SURREALDB_TEST_NS = "lucia_adapter_test_ns",
  SURREALDB_TEST_DB = "lucia_adapter_test_db",
  SURREALDB_TEST_SESSION_TABLE = "session_table",
  SURREALDB_TEST_USER_TABLE = "user_table",
} = process.env;

const db = new Surreal();

try {
  await db.connect(SURREALDB_TEST_URL, {versionCheck: false}),
    await db.use({
      namespace: SURREALDB_TEST_NS,
      database: SURREALDB_TEST_DB,
    });
  await db.signin({
    username: SURREALDB_TEST_USER,
    password: SURREALDB_TEST_PASS,
  });
} catch (error) {
  console.error({ errorDBInit: error });
}

const adapter = new SurrealDBLuciaAdapter(db, {
  sessionTableName: SURREALDB_TEST_SESSION_TABLE,
  userTableName: SURREALDB_TEST_USER_TABLE,
});

const lucia_user_rid = SURREALDB_TEST_USER_TABLE + ":" + databaseUser.id;
const today = new Date();
const tomorrow = new Date(today.setDate(today.getDate() + 1));
const y2k38 = new Date(2038, 0, 19, 23, 59, 59);
const tblDate = new Date(1991, 7, 6);

const poorSessionId = "poor_session_id";
const secondSessionId = crypto.randomUUID().replaceAll("-", "");
const thirdSessionId = crypto.randomUUID().replaceAll("-", "");

await db.query(
  `CREATE ${lucia_user_rid} SET username = "${databaseUser.attributes.username}";`
);

describe("SurrealDBLuciaAdapter", async () => {
  beforeAll(async () => {
    await db.query("DELETE $sessionTable; DELETE $userTable", {
      sessionTable: new Table(SURREALDB_TEST_SESSION_TABLE),
      userTable: new Table(SURREALDB_TEST_USER_TABLE),
    });
  })
  afterAll(async () => {
    await db.query("DELETE $sessionTable; DELETE $userTable", {
      sessionTable: new Table(SURREALDB_TEST_SESSION_TABLE),
      userTable: new Table(SURREALDB_TEST_USER_TABLE),
  });
  })
  test(`[not adapter thing] should successfully create ${lucia_user_rid} with username '${databaseUser.attributes.username}' `, async () => {
    const test_user = (
      await db.query<[SurrealUser[]]>(
        `CREATE type::thing(${lucia_user_rid}) SET username = "${databaseUser.attributes.username}";`
      )
    )[0][0];

    expect(test_user.id.id).toBe(databaseUser.id);
    expect(test_user.username).toBe(databaseUser.attributes.username);
  });

  // setSession() and getUserSessions() test
  test(`should successfully setSession({...}) and getUserSessions('${databaseUser.id}')`, async () => {
    await adapter.setSession({
      id: poorSessionId,
      userId: databaseUser.id,
      expiresAt: tomorrow,
      attributes: {
        alias: "poorSession",
        os: "mockOS",
      },
    });
    const sessionFromDb = await adapter.getUserSessions(databaseUser.id);

    expect(sessionFromDb[0]?.id).toBe(poorSessionId);
    expect(sessionFromDb[0]?.userId).toBe(databaseUser.id);
  });

  // deleteSession() test
  test(`should successfully deleteSession('${poorSessionId}')`, async () => {
    await adapter.deleteSession(poorSessionId);
    const sessionFromDb = await adapter.getSessionAndUser(poorSessionId);

    expect(sessionFromDb[0]).toBeNull();
    expect(sessionFromDb[1]).toBeNull();
  });

  test(`[not adapter thing] should set two sessions for ${lucia_user_rid}`, async () => {
    await adapter.setSession({
      id: secondSessionId,
      userId: databaseUser.id,
      expiresAt: tomorrow,
      attributes: {
        alias: "secondSession",
        os: "mockOS",
      },
    });
    await adapter.setSession({
      id: thirdSessionId,
      userId: databaseUser.id,
      expiresAt: tomorrow,
      attributes: {
        alias: "thirdSession",
        os: "luciaOS",
      },
    });
    await adapter.setSession({
      id: crypto.randomUUID().replaceAll("-", ""),
      userId: databaseUser.id,
      expiresAt: tomorrow,
      attributes: {
        alias: "anotherOne",
        os: "Doors",
      },
    });

    const secondSessionFromDb = await adapter.getSessionAndUser(secondSessionId);
    const thirdSessionFromDb = await adapter.getSessionAndUser(thirdSessionId);

    const { "0": secondSession, "1": secondUser } = secondSessionFromDb;
    const { "0": thirdSession, "1": thirdUser } = thirdSessionFromDb;

    expect(secondSession?.id).toBe(secondSessionId);
    expect(secondUser?.id).toBe(databaseUser.id);

    // different session, same user
    expect(thirdSession?.id).toBe(thirdSessionId);
    expect(thirdUser?.id).toBe(databaseUser.id);
  });

  // updateSessionExpiration()
  test(`should successfully updateSessionExpiration('${secondSessionId}', y2k38) to Y2K38 date'`, async () => {
    // update secondSession to future date (y2k38)
    await adapter.updateSessionExpiration(secondSessionId, y2k38);
    const secondSessionFromDb = await adapter.getSessionAndUser(
      secondSessionId
    );

    expect(secondSessionFromDb[0]?.expiresAt).toEqual(y2k38);

    // update thirdSession to past date (tblDate)
    await adapter.updateSessionExpiration(thirdSessionId, tblDate);
    const thirdSessionFromDb = await adapter.getSessionAndUser(thirdSessionId);
    expect(thirdSessionFromDb[0]?.expiresAt).toEqual(tblDate);
  });

  // deleteExpiredSessions()
  test(`should successfully deleteExpiredSessions()`, async () => {
    // prepare surrealdb query to get expired sessions
    const getExpiredSessionsQuery = surrealql`SELECT * FROM type::table($sessionTable) WHERE expires_at < time::now() FETCH user`;

    const expiredSessions = (
      await db.query<[SurrealSession[]]>(getExpiredSessionsQuery, {
        sessionTable: SURREALDB_TEST_SESSION_TABLE,
      })
    )[0];
    
    // make sure that there are at least one expired session at this point
    expect(expiredSessions.length).toBeGreaterThanOrEqual(1);

    await adapter.deleteExpiredSessions();

    const sessionsAfterDeleteExpiredSessions = (
      await db.query<[SurrealSession[]]>(getExpiredSessionsQuery, {
        sessionTable: SURREALDB_TEST_SESSION_TABLE,
      })
    )[0];

    // actually test if the expired sessions have been deleted
    expect(sessionsAfterDeleteExpiredSessions.length).toBe(0);
  });

  test(`should successfully deleteSession('${secondSessionId}')`, async () => {
    const sessionFromDb = await adapter.getSessionAndUser(secondSessionId);
    expect(sessionFromDb[0]).not.toBeNull();

    await adapter.deleteSession(secondSessionId);
    const afterDeleteSession = await adapter.getSessionAndUser(secondSessionId);

    expect(afterDeleteSession[0]).toBeNull();
  });
});
