import type { RequestHandler } from "@sveltejs/kit";
import { readSidFromCookie, verifySession } from "../../../../../lib/api/auth";
import {
	getOptionalNumber,
	getRequired,
	isProd,
} from "../../../../../lib/api/env";
import { httpError, httpJson } from "../../../../../lib/api/http";

export const GET: RequestHandler = async (event) => {
	const env = event.platform.env as any;

	const sid = readSidFromCookie(event.request);
	if (!sid) return httpError("UNAUTHENTICATED", "sid cookie required", 401);

	const sessionTtl = getOptionalNumber(
		env,
		"AUTH_SESSION_TTL_SECONDS",
		7 * 24 * 3600,
	);
	const secret = getRequired(env, "AUTH_SESSION_SECRET");

	let email = "";
	try {
		const s = await verifySession(secret, sid, sessionTtl);
		email = s.email;
	} catch {
		return httpError("UNAUTHENTICATED", "invalid or expired session", 401);
	}

	try {
		const row = await env.DB.prepare(
			"SELECT user_id as userId, email, created_at as createdAt FROM users WHERE email=?1",
		)
			.bind(email)
			.first<{ userId: string; email: string; createdAt: number }>();

		if (!row) return httpError("UNAUTHENTICATED", "user not found", 401);
		return httpJson({ ok: true, data: row });
	} catch (e) {
		if (isProd(env)) return httpError("INTERNAL", "database error", 500);
		return httpError("INTERNAL", String(e));
	}
};
