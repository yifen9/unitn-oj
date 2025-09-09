import { randomHex } from "$lib/api/crypto/random";

export async function createLoginToken(
	db: D1Database,
	email: string,
	ttlSeconds: number,
) {
	const token = randomHex(32);
	const now = Math.floor(Date.now() / 1000);
	const exp = now + ttlSeconds;
	await db
		.prepare(
			"DELETE FROM tokens WHERE email=?1 AND purpose='login' AND consumed_at_s IS NULL",
		)
		.bind(email)
		.run();
	await db
		.prepare(
			"INSERT INTO tokens (token,email,purpose,created_at_s,expires_at_s) VALUES (?1,?2,'login',unixepoch(),?3)",
		)
		.bind(token, email, exp)
		.run();
	return { token, expiresAtS: exp };
}

export async function findLoginToken(db: D1Database, token: string) {
	return await db
		.prepare(
			"SELECT email, expires_at_s, consumed_at_s FROM tokens WHERE token=?1 AND purpose='login'",
		)
		.bind(token)
		.first<{
			email: string;
			expires_at_s: number;
			consumed_at_s: number | null;
		}>();
}

export async function consumeLoginToken(db: D1Database, token: string) {
	await db
		.prepare(
			"UPDATE tokens SET consumed_at_s=unixepoch() WHERE token=?1 AND consumed_at_s IS NULL",
		)
		.bind(token)
		.run();
}
