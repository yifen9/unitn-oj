import {
	readSidFromCookie,
	userIdFromEmail,
	verifySession,
} from "../../../../../lib/api/auth";
import {
	getOptionalNumber,
	getRequired,
	isProd,
} from "../../../../../lib/api/env";
import { httpError, httpJson } from "../../../../../lib/api/http";

export const onRequestGet: PagesFunction = async ({ request, env }) => {
	const sid = readSidFromCookie(request);
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
	const uid = await userIdFromEmail(email);

	try {
		const r = await env.DB.prepare(
			"SELECT submission_id as submissionId, user_id as userId, problem_id as problemId, status, created_at as createdAt " +
				"FROM submissions WHERE user_id=?1 ORDER BY created_at DESC",
		)
			.bind(uid)
			.all<{
				submissionId: string;
				userId: string;
				problemId: string;
				status: string;
				createdAt: number;
			}>();
		return httpJson({ ok: true, data: r.results });
	} catch (e) {
		if (isProd(env)) return httpError("INTERNAL", "database error", 500);
		return httpError("INTERNAL", String(e));
	}
};
