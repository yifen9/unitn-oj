import { logAuthEvent } from "$lib/api/audit";
import { assertDb } from "$lib/api/d1";
import { sendEmail } from "$lib/api/email/resend";
import {
	getBindings,
	getOptionalNumber,
	getOptionalString,
	getRequired,
	isProdFrom,
	isRateLimitEnabledFrom,
} from "$lib/api/env";
import { ok, problemFrom, readJson, withTrace } from "$lib/api/http";
import { enforceEmailIssueQuota } from "$lib/api/rate_limit";
import { clientIp, userAgent } from "$lib/api/request";
import { assertAllowedDomain, normalizeEmail } from "$lib/api/security/email";
import { createLoginToken } from "$lib/api/tokens";
import { verifyTurnstile } from "$lib/api/turnstile";
import { buildMagicLink } from "$lib/api/url";
import type { RequestHandler } from "./$types";

type Body = {
	email?: string;
	turnstileToken?: string;
	"cf-turnstile-response"?: string;
};

export const POST: RequestHandler = async (event) => {
	try {
		const body = await readJson<Body>(event.request);
		const envAll = (event.platform?.env ?? {}) as Record<string, unknown>;
		const { DB, APP_ENV } = getBindings(event);
		const prod = isProdFrom({ DB, APP_ENV });
		const allowed = getRequired(envAll, "AUTH_ALLOWED_DOMAIN");
		const email = normalizeEmail(body.email ?? "");
		assertAllowedDomain(email, allowed);
		if (prod) {
			const tokenFromClient = String(
				body.turnstileToken ?? body["cf-turnstile-response"] ?? "",
			);
			if (!tokenFromClient)
				throw problemFrom("PERMISSION_DENIED", {
					detail: "turnstile token required",
				});
			const secret = getRequired(envAll, "TURNSTILE_SECRET");
			const okTurnstile = await verifyTurnstile(tokenFromClient, secret);
			if (!okTurnstile)
				throw problemFrom("PERMISSION_DENIED", {
					detail: "turnstile verification failed",
				});
		}
		assertDb(DB);
		const emailWin = getOptionalNumber(
			envAll,
			"RATE_EMAIL_ISSUE_WINDOW_S",
			3600,
		);
		const emailLim = getOptionalNumber(envAll, "RATE_EMAIL_ISSUE_LIMIT", 5);
		const bindings = { DB, APP_ENV };
		if (isRateLimitEnabledFrom(bindings)) {
			await enforceEmailIssueQuota(DB, email, emailWin, emailLim);
		}
		const ttl = getOptionalNumber(envAll, "AUTH_TOKEN_TTL_SECONDS", 300);
		const { token } = await createLoginToken(DB, email, ttl);
		const link = buildMagicLink(event.request, token);
		const ip = clientIp(event.request);
		const ua = userAgent(event.request);
		const hashKey = prod
			? getRequired(envAll, "LOG_HASH_KEY")
			: getOptionalString(envAll, "LOG_HASH_KEY", "dev");
		await logAuthEvent(DB, hashKey, "token_create", email, ip, ua, {
			token_len: token.length,
		});
		if (prod) {
			const apiKey = getRequired(envAll, "RESEND_API_KEY");
			const from = getOptionalString(
				envAll,
				"RESEND_FROM",
				"UNITN OJ <noreply@oj.yifen9.li>",
			);
			await sendEmail(
				apiKey,
				from,
				email,
				"Sign in to UNITN OJ",
				`<p>Click the button to sign in:</p><p><a href="${link}" target="_blank" rel="noopener">Continue sign-in</a></p><p>If you did not request this, you can ignore this email.</p>`,
			);
			return withTrace(ok({ ok: true }), event.request);
		}
		return withTrace(ok({ ok: true, data: { magicUrl: link } }), event.request);
	} catch (e) {
		if (e instanceof Response) return withTrace(e, event.request);
		return withTrace(
			problemFrom("INTERNAL", { detail: "unexpected error" }),
			event.request,
		);
	}
};
