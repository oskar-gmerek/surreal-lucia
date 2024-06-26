import type { Adapter, DatabaseSession, DatabaseUser, UserId } from "npm:lucia@3.2.0";
import { RecordId, Table } from "npm:surrealdb.js@1.0.0-beta.9";
import type { Surreal } from "npm:surrealdb.js@1.0.0-beta.9";
import type { DatabaseTables, SurrealSession } from "../src/types.ts";
import {
  mapToLuciaDatabaseSession,
  mapToLuciaDatabaseUser,
} from "./helpers.ts";

export class SurrealDBLuciaAdapter implements Adapter {
  private db: Surreal;
  private sessionTableName;
  private userTableName;

  /**
   * Constructs a new instance of the SurrealDBLuciaAdapter class.
   *
   * @param {Surreal} db - The SurrealDB instance to use for database operations.
   * @param {DatabaseTables} options - The options for the adapter, including the session table name and user table name.
   * @param {string} options.sessionTableName - The name of the table to use for storing sessions.
   * @param {string} options.userTableName - The name of the table to use for storing users.
   */
  constructor(
    db: Surreal,
    { sessionTableName, userTableName }: DatabaseTables
  ) {
    this.db = db;
    this.sessionTableName = sessionTableName;
    this.userTableName = userTableName;
  }

  /**
   * Deletes a session from the database.
   *
   * @param {string} sessionId - The ID of the session to delete. NOT RecordId!
   * @return {Promise<void>} A promise that resolves when the session is deleted.
   * The promise does not return any value.
   */
  public async deleteSession(sessionId: string): Promise<void> {
    await this.db.query("DELETE type::thing($surrealSession)", {
      surrealSession: new RecordId(this.sessionTableName, sessionId),
    });
  }

  /**
   * Deletes user sessions based on the provided userId.
   *
   * @param {UserId} userId - The ID of the user whose sessions are to be deleted. NOT RecordId!
   * @return {Promise<void>} A promise that resolves when the user sessions are deleted.
   * The promise does not return any value.
   */
  public async deleteUserSessions(userId: UserId): Promise<void> {
    await this.db.query(
      "DELETE type::table($surrealSession) WHERE user = type::thing($userId)",
      {
        surrealSession: new Table(this.sessionTableName),
        userId: new RecordId(this.userTableName, userId),
      }
    );
  }

/**
 * Retrieves a session and its associated user from the database.
 *
 * @param {string} sessionId - The ID of the session to retrieve. NOT RecordId!
 * @return {Promise<[session: DatabaseSession | null, user: DatabaseUser | null]>}
 * A promise that resolves to an array containing the session and user.
 * If the session or user does not exist, the corresponding value in the array will be null.
 */
  public async getSessionAndUser(
    sessionId: string
  ): Promise<[session: DatabaseSession | null, user: DatabaseUser | null]> {
    const result = (
      await this.db.query<[SurrealSession[]]>(
        "SELECT * FROM type::thing($surrealSession) FETCH user",
        {
          surrealSession: new RecordId(this.sessionTableName, sessionId),
          userTable: this.userTableName,
        }
      )
    )[0][0];

    if (!result) return [null, null];

    return [
      mapToLuciaDatabaseSession(result),
      mapToLuciaDatabaseUser(result.user),
    ];
  }

  /**
   * Retrieves the sessions associated with a given user from the database.
   *
   * @param {UserId} userId - The ID of the user whose sessions are to be retrieved. NOT RecordId!
   * @return {Promise<DatabaseSession[]>} A promise that resolves to an array of DatabaseSession objects representing the user's sessions.
   * If the user has no sessions, an empty array is returned.
   */
  public async getUserSessions(userId: UserId): Promise<DatabaseSession[]> {
    const result = (
      await this.db.query<[SurrealSession[]]>(
        "SELECT * FROM type::table($sessionTable) WHERE user = type::thing($userId) FETCH user",
        {
          sessionTable: new Table(this.sessionTableName),
          userTable: this.userTableName,
          userId: new RecordId(this.userTableName, userId),
        }
      )
    )[0];

    if (result.length === 0) return [];

    return result.map((session) => {
      return mapToLuciaDatabaseSession(session);
    });
  }

  /**
   * Sets a session in the database.
   *
   * @param {DatabaseSession} session - The session object to be set.
   * @return {Promise<void>} A promise that resolves when the session is successfully set.
   * The promise does not return any value.
   */
  public async setSession(session: DatabaseSession): Promise<void> {
    const { id, userId, expiresAt, ...attributes } = session;
    const content = {
      id: new RecordId(this.sessionTableName, id),
      user: new RecordId(this.userTableName, userId),
      expires_at: expiresAt,
      ...attributes.attributes,
    };

    (
      await this.db.query<[SurrealSession[]]>(
        "CREATE type::table($sessionTable) CONTENT $content",
        {
          sessionTable: new Table(this.sessionTableName),
          content: content,
        }
      )
    )[0][0];
  }

  /**
   * Updates the expiration date of a session in the database.
   *
   * @param {string} sessionId - The ID of the session to update. NOT RecordId!
   * @param {Date} expiresAt - The new expiration date for the session.
   * @return {Promise<void>} A promise that resolves when the session's expiration date is successfully updated.
   * The promise does not return any value.
   */
  public async updateSessionExpiration(
    sessionId: string,
    expiresAt: Date
  ): Promise<void> {
    await this.db.query(
      "UPDATE type::thing($surrealSession) SET expires_at = type::datetime($expiresAt) ",
      {
        surrealSession: new RecordId(this.sessionTableName, sessionId),
        expiresAt: expiresAt,
      }
    );
  }

  /**
   * Deletes expired sessions from the database.
   *
   * @return {Promise<void>} A promise that resolves when the expired sessions are successfully deleted.
   * The promise does not return any value.
   */
  public async deleteExpiredSessions(): Promise<void> {
    await this.db.query(
      "DELETE type::table($sessionTable) WHERE expires_at < time::now()",
      {
        sessionTable: new Table(this.sessionTableName),
      }
    );
  }
}
