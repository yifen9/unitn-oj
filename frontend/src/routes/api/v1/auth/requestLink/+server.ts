import type { RequestHandler } from "@sveltejs/kit";
import {
	getOptionalNumber,
	getRequired,
	isProd,
} from "../../../../../lib/api/env";
import { httpError, httpJson, readJson } from "../../../../../lib/api/http";
import { logError, logInfo } from "../../../../../lib/api/log";

function randomHex(len = 32) {
	const bytes = new Uint8Array(len);
	crypto.getRandomValues(bytes);
	return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const POST: RequestHandler = async (event) => {
	const { request, platform } = event;
	const env = platform.env as unknown as { DB: D1Database } & Record<
		string,
		string
	>;
	const prod = isProd(env);

	let email = "",
		turnstileToken = "";
	try {
		const body = await readJson<{
			email?: string;
			turnstileToken?: string;
			["cf-turnstile-response"]?: string;
		}>(request);
		email = String(body.email ?? "")
			.trim()
			.toLowerCase();
		turnstileToken = String(
			body.turnstileToken ?? body["cf-turnstile-response"] ?? "",
		);
	} catch (e) {
		return e as Response;
	}

	const allowedDomain = getRequired(env, "AUTH_ALLOWED_DOMAIN");
	if (!email || !email.endsWith(`@${allowedDomain}`)) {
		return httpError(
			"INVALID_ARGUMENT",
			`email must end with @${allowedDomain}`,
			400,
		);
	}

	if (prod) {
		const secret = getRequired(env, "TURNSTILE_SECRET");
		if (!turnstileToken)
			return httpError("PERMISSION_DENIED", "turnstile token required", 403);
		const verify = await fetch(
			"https://challenges.cloudflare.com/turnstile/v0/siteverify",
			{
				method: "POST",
				headers: { "content-type": "application/x-www-form-urlencoded" },
				body: new URLSearchParams({
					secret,
					response: turnstileToken /* remoteip Optional */,
				}),
			},
		)
			.then((r) => r.json())
			.catch(() => ({ success: false }));
		if (!verify?.success)
			return httpError(
				"PERMISSION_DENIED",
				"turnstile verification failed",
				403,
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
		//logError("d1.insert.magic_tokens.failed", { err: String(e) });
		return prod
			? httpError("INTERNAL", "database error", 500)
			: httpJson({ ok: true, data: { debug: "d1 insert failed" } }, 500);
	}

	const base = new URL(request.url);
	base.pathname = "/auth/continue";
	base.searchParams.set("token", token);
	const continueUrl = base.toString();

	if (prod) {
		const apiKey = getRequired(env, "RESEND_API_KEY");
		const payload = {
			from: "UNITN OJ <noreply@oj.yifen9.li>",
			to: email,
			subject: "Sign in to UNITN OJ",
			html: `<p>Click the button to sign in:</p><p><a href="${continueUrl}" target="_blank" rel="noopener">Continue sign-in</a></p><p>If you did not request this, you can ignore this email.</p>`,
		};
		const r = await fetch("https://api.resend.com/emails", {
			method: "POST",
			headers: {
				authorization: `Bearer ${apiKey}`,
				"content-type": "application/json",
			},
			body: JSON.stringify(payload),
		});
		const jr = await r.json().catch(() => ({}));
		if (!r.ok) {
			//logError("resend.send.failed", { status: r.status, body: jr });
			return httpError("INTERNAL", "send email failed", 500);
		}
		//logInfo("resend.send.ok", { id: jr?.id });
		return httpJson({ ok: true });
	}

	return httpJson({ ok: true, data: { magicUrl: continueUrl } });
};
