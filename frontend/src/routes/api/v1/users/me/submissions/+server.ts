import type { RequestHandler } from "@sveltejs/kit";
import {
	readSidFromCookie,
	userIdFromEmail,
	verifySession,
} from "../../../../../../lib/api/auth";
import {
	getOptionalNumber,
	getRequired,
	isProd,
} from "../../../../../../lib/api/env";
import { httpError, httpJson } from "../../../../../../lib/api/http";
import { listByUser } from "../../../../../../lib/data/submissions";

export const GET: RequestHandler = async (event) => {
	const env = event.platform.env as any;
	const sid = readSidFromCookie(event.request);
	if (!sid) return httpError("UNAUTHENTICATED", "sid cookie required", 401);

	const ttl = getOptionalNumber(env, "AUTH_SESSION_TTL_SECONDS", 7 * 24 * 3600);
	const secret = getRequired(env, "AUTH_SESSION_SECRET");
	let email = "";
	try {
		email = (await verifySession(secret, sid, ttl)).email;
	} catch {
		return httpError("UNAUTHENTICATED", "invalid or expired session", 401);
	}
	const uid = await userIdFromEmail(email);

	try {
		const items = await listByUser(env, uid);
		return httpJson({ ok: true, data: items });
	} catch (e) {
		if (isProd(env)) return httpError("INTERNAL", "database error", 500);
		return httpError("INTERNAL", String(e));
	}
};
