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

function readId(req: Request, params: Record<string, string> | undefined) {
	const p = params?.id;
	if (p) return p;
	const m = new URL(req.url).pathname.match(/\/api\/v1\/submissions\/([^/]+)$/);
	return m ? decodeURIComponent(m[1]) : "";
}

export const onRequestGet: PagesFunction = async ({ request, env, params }) => {
	const submissionId = readId(request, params as any);
	if (!submissionId) return httpError("INVALID_ARGUMENT", "id required", 400);

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
		const row = await env.DB.prepare(
			"SELECT submission_id as submissionId, user_id as userId, problem_id as problemId, status, created_at as createdAt FROM submissions WHERE submission_id=?1",
		)
			.bind(submissionId)
			.first<{
				submissionId: string;
				userId: string;
				problemId: string;
				status: string;
				createdAt: number;
			}>();
		if (!row) return httpError("NOT_FOUND", "submission not found", 404);
		if (row.userId !== uid)
			return httpError("PERMISSION_DENIED", "not owner", 403);
		return httpJson({ ok: true, data: row });
	} catch (e) {
		if (isProd(env)) return httpError("INTERNAL", "database error", 500);
		return httpError("INTERNAL", String(e));
	}
};
