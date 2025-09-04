import { getOptionalNumber, getRequired, isProd } from "../../../_lib/env";
import { httpError, httpJson, readJson } from "../../../_lib/http";

export const onRequestPost: PagesFunction = async ({ request, env }) => {
	const prod = isProd(env);

	let email = "";
	try {
		const body = await readJson<{ email?: string }>(request);
		email = String(body.email ?? "")
			.trim()
			.toLowerCase();
	} catch (e) {
		return e as Response;
	}

	let allowedDomain = "";
	try {
		allowedDomain = getRequired(env, "AUTH_ALLOWED_DOMAIN");
	} catch {
		return httpError("FAILED_PRECONDITION", "AUTH_ALLOWED_DOMAIN missing");
	}

	if (!email || !email.endsWith(`@${allowedDomain}`)) {
		return httpError(
			"INVALID_ARGUMENT",
			`email must end with @${allowedDomain}`,
			400,
		);
	}

	const tokenTtlSeconds = getOptionalNumber(env, "AUTH_TOKEN_TTL_SECONDS", 300);
	const token = randomHex(32);
	const expiresAt = Math.floor(Date.now() / 1000) + tokenTtlSeconds;

	try {
		await env.DB.prepare(
			"INSERT INTO magic_tokens (token,email,expires_at) VALUES (?1,?2,?3)",
		)
			.bind(token, email, expiresAt)
			.run();
	} catch (e) {
		console.error("D1 insert failed:", e);
		if (prod) return httpError("INTERNAL", "database error", 500);
	}

	const url = new URL(request.url);
	url.pathname = "/auth/verify";
	url.searchParams.set("token", token);

	if (prod) return httpJson({ ok: true });
	return httpJson({ ok: true, data: { magicUrl: url.toString() } });
};

function randomHex(len = 32) {
	const bytes = new Uint8Array(len);
	crypto.getRandomValues(bytes);
	return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}
