import { logAuthEvent } from "$lib/api/audit";
import { signSession } from "$lib/api/auth/session";
import { buildSessionSetCookie } from "$lib/api/cookies";
import { hmacHex } from "$lib/api/crypto/hmac";
import { assertDb } from "$lib/api/d1";
import {
	getBindings,
	getOptionalNumber,
	getOptionalString,
	getRequired,
	isProdFrom,
} from "$lib/api/env";
import { ok, problemFrom, readJson, withTrace } from "$lib/api/http";
import { enforceIpVerifyQuota } from "$lib/api/rate_limit";
import { clientIp, userAgent } from "$lib/api/request";
import { normalizeEmail } from "$lib/api/security/email";
import { consumeLoginToken, findLoginToken } from "$lib/api/tokens";
import { ensureUserActive } from "$lib/api/users";
import type { RequestHandler } from "./$types";

async function verifyCore(event: Parameters<RequestHandler>[0], token: string) {
	const envAll = (event.platform?.env ?? {}) as Record<string, unknown>;
	const { DB, APP_ENV } = getBindings(event);
	const prod = isProdFrom({ DB, APP_ENV });
	if (!token)
		throw problemFrom("INVALID_ARGUMENT", { detail: "token required" });
	assertDb(DB);
	const ip = clientIp(event.request);
	const ua = userAgent(event.request);
	const hashKey = prod
		? getRequired(envAll, "LOG_HASH_KEY")
		: getOptionalString(envAll, "LOG_HASH_KEY", "dev");
	const ipHash = ip ? await hmacHex(hashKey, ip) : "";
	const ipWin = getOptionalNumber(envAll, "RATE_IP_VERIFY_WINDOW_S", 300);
	const ipLim = getOptionalNumber(envAll, "RATE_IP_VERIFY_LIMIT", 30);
	await enforceIpVerifyQuota(DB, ipHash, ipWin, ipLim);
	const row = await findLoginToken(DB, token);
	if (!row) {
		await logAuthEvent(DB, hashKey, "login_failure", null, ip, ua, {
			reason: "not_found",
		});
		throw problemFrom("UNAUTHENTICATED", { detail: "token not found" });
	}
	if (row.consumed_at_s != null) {
		await logAuthEvent(DB, hashKey, "login_failure", null, ip, ua, {
			reason: "used",
		});
		throw problemFrom("UNAUTHENTICATED", { detail: "token already used" });
	}
	const now = Math.floor(Date.now() / 1000);
	if (row.expires_at_s < now) {
		await consumeLoginToken(DB, token);
		await logAuthEvent(DB, hashKey, "login_failure", null, ip, ua, {
			reason: "expired",
		});
		throw problemFrom("UNAUTHENTICATED", { detail: "token expired" });
	}
	const email = normalizeEmail(row.email);
	const u = await ensureUserActive(DB, email);
	await consumeLoginToken(DB, token);
	const ttl = getOptionalNumber(
		envAll,
		"AUTH_SESSION_TTL_SECONDS",
		7 * 24 * 3600,
	);
	const secret = getRequired(envAll, "AUTH_SESSION_SECRET");
	const sid = await signSession(secret, email);
	await logAuthEvent(DB, hashKey, "login_success", email, ip, ua, {
		user_id: u.id,
	});
	const base = ok({ ok: true, data: { userId: u.id, email, slug: u.slug } });
	const headers = new Headers(base.headers);
	headers.append("set-cookie", buildSessionSetCookie("sid", sid, ttl, prod));
	return new Response(base.body, { status: base.status, headers });
}

export const GET: RequestHandler = async (event) => {
	try {
		const u = new URL(event.request.url);
		const token = u.searchParams.get("token") ?? "";
		const { DB, APP_ENV } = getBindings(event);
		const prod = isProdFrom({ DB, APP_ENV });
		if (prod) {
			const to = `/auth/continue${token ? `?token=${encodeURIComponent(token)}` : ""}`;
			return withTrace(
				new Response(null, {
					status: 302,
					headers: { location: to, "cache-control": "no-store" },
				}),
				event.request,
			);
		}
		const resp = await verifyCore(event, token);
		return withTrace(resp, event.request);
	} catch (e) {
		if (e instanceof Response) return withTrace(e, event.request);
		return withTrace(
			problemFrom("INTERNAL", { detail: "unexpected error" }),
			event.request,
		);
	}
};

type Body = { token?: string };

export const POST: RequestHandler = async (event) => {
	try {
		const body = await readJson<Body>(event.request);
		const token = String(body.token ?? "").trim();
		const resp = await verifyCore(event, token);
		return withTrace(resp, event.request);
	} catch (e) {
		if (e instanceof Response) return withTrace(e, event.request);
		return withTrace(
			problemFrom("INTERNAL", { detail: "unexpected error" }),
			event.request,
		);
	}
};
