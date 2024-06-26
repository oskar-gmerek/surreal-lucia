import type { RegisteredDatabaseSessionAttributes, RegisteredDatabaseUserAttributes } from "npm:lucia";
import type { RecordId } from "npm:surrealdb.js";

/**
 * Maps a SurrealDB tables uses for storing sessions and users to the adapter.
 */
export type DatabaseTables = {
  /** The name of the table used to store sessions in SurrealDB. */
  sessionTableName: string,
  /** The name of the table used to store users in SurrealDB. */
  userTableName: string
}

/**
 * Represents a user in the SurrealDB.
*/
export type SurrealUser = {
  /** The RecordId of the user */
  id: RecordId;
} & RegisteredDatabaseUserAttributes;

/**
 *  Represents a session in the SurrealDB.
 */
export type SurrealSession = {
  /** The RecordId of the session */
  id: RecordId;
  /** The expiration Date of the session. */
  expires_at: Date;
  /** The object representing the user that owns the session. */
  user: SurrealUser;
} & RegisteredDatabaseSessionAttributes;
