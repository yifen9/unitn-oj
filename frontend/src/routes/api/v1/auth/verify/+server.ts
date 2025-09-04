import { signSession, userIdFromEmail } from "../../../../../lib/api/auth";
import {
	getOptionalNumber,
	getRequired,
	isProd,
} from "../../../../../lib/api/env";
import { httpError, readJson } from "../../../../../lib/api/http";

export const onRequest: PagesFunction = async ({ request, env }) => {
	const prod = isProd(env);

	let token = new URL(request.url).searchParams.get("token") || "";
	if (!token && request.method === "POST") {
		try {
			const body = await readJson<{ token?: string }>(request);
			token = String(body.token ?? "").trim();
		} catch (e) {
			return e as Response;
		}
	}
	if (!token) return httpError("INVALID_ARGUMENT", "token required", 400);

	let email = "";
	try {
		const row = await env.DB.prepare(
			"SELECT email, expires_at FROM magic_tokens WHERE token=?1",
		)
			.bind(token)
			.first<{ email: string; expires_at: number }>();

		if (!row) return httpError("UNAUTHENTICATED", "token not found", 401);
		if (row.expires_at < Math.floor(Date.now() / 1000)) {
			await env.DB.prepare("DELETE FROM magic_tokens WHERE token=?1")
				.bind(token)
				.run()
				.catch(() => {});
			return httpError("UNAUTHENTICATED", "token expired", 401);
		}
		email = row.email.toLowerCase();
	} catch (e) {
		console.error("D1 select failed:", e);
		if (prod) return httpError("INTERNAL", "database error", 500);
	}

	const nowSec = Math.floor(Date.now() / 1000);
	const userId = await userIdFromEmail(email);
	try {
		await env.DB.batch?.([
			env.DB.prepare(
				"INSERT INTO users(user_id,email,created_at) VALUES(?1,?2,?3) " +
					"ON CONFLICT(email) DO UPDATE SET email=excluded.email",
			).bind(userId, email, nowSec),
			env.DB.prepare("DELETE FROM magic_tokens WHERE token=?1").bind(token),
		]);
	} catch (e) {
		console.error("D1 upsert/delete failed:", e);
		if (prod) return httpError("INTERNAL", "database error", 500);
	}

	const sessionTtlSeconds = getOptionalNumber(
		env,
		"AUTH_SESSION_TTL_SECONDS",
		7 * 24 * 3600,
	);
	const secret = getRequired(env, "AUTH_SESSION_SECRET");
	const sid = await signSession(secret || "dev-secret", email);

	const headers = new Headers({ "content-type": "application/json" });
	const cookieAttrs = [
		`sid=${sid}`,
		"HttpOnly",
		"Path=/",
		`Max-Age=${sessionTtlSeconds}`,
		"SameSite=Lax",
		isProd(env) ? "Secure" : "",
	]
		.filter(Boolean)
		.join("; ");
	headers.append("set-cookie", cookieAttrs);

	return new Response(JSON.stringify({ ok: true, data: { userId, email } }), {
		headers,
	});
};
