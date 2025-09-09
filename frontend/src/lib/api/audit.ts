export type AuthEventType =
	| "token_create"
	| "token_verify"
	| "login_success"
	| "login_failure"
	| "logout";

import { hmacHex } from "$lib/api/crypto/hmac";

export async function logAuthEvent(
	db: D1Database,
	hashKey: string,
	type: AuthEventType,
	email: string | null,
	ip: string | null,
	ua: string,
	details?: Record<string, unknown>,
) {
	const email_hash = email ? await hmacHex(hashKey, email) : null;
	const ip_hash = ip ? await hmacHex(hashKey, ip) : null;
	const id = crypto.randomUUID();
	await db
		.prepare(
			"INSERT INTO auth_logs (id,type,email_hash,ip_hash,user_agent,details,created_at_s) VALUES (?1,?2,?3,?4,?5,?6,unixepoch())",
		)
		.bind(
			id,
			type,
			email_hash,
			ip_hash,
			ua,
			details ? JSON.stringify(details) : null,
		)
		.run();
}
