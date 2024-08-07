import type {
	DatabaseSession as LuciaDatabaseSession,
	DatabaseUser as LuciaDatabaseUser,
} from "lucia";
import type { SurrealSession, SurrealUser } from "./types.ts";

/**
 * Maps a SurrealSession object to a Lucia's DatabaseSession object.
 *
 * @param {SurrealSession} session - The SurrealSession object to map.
 * @return {LuciaDatabaseSession} - The mapped Lucia's DatabaseSession object.
 */
export function mapToLuciaDatabaseSession(session: SurrealSession): LuciaDatabaseSession {
	const { id, user, expires_at, ...attributes } = session;

	const sessionIdString = id.id.toString();
	const userIdString = user.id.id.toString();

	return {
		id: sessionIdString,
		expiresAt: expires_at,
		userId: userIdString,
		attributes,
	};
}

/**
 * Maps a SurrealUser object to a Lucia's DatabaseUser object.
 *
 * @param {SurrealUser} user - The SurrealUser object to map.
 * @return {LuciaDatabaseUser} - The mapped Lucia's DatabaseUser object.
 */
export function mapToLuciaDatabaseUser(user: SurrealUser): LuciaDatabaseUser {
	const { id, ...attributes } = user;
	const userIdString = id.id.toString();

	return {
		id: userIdString,
		attributes,
	};
}
