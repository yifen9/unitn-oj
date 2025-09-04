import {
	readSidFromCookie,
	userIdFromEmail,
	verifySession,
} from "../../../../../../../lib/api/auth";
import {
	getOptionalNumber,
	getRequired,
	isProd,
} from "../../../../../../../lib/api/env";
import {
	httpError,
	httpJson,
	readJson,
} from "../../../../../../../lib/api/http";

function readProblemId(
	req: Request,
	params: Record<string, string> | undefined,
) {
	const p = params?.id;
	if (p) return p;
	const m = new URL(req.url).pathname.match(
		/\/api\/v1\/problems\/([^/]+)\/submissions\/?$/,
	);
	return m ? decodeURIComponent(m[1]) : "";
}

function id() {
	const b = new Uint8Array(8);
	crypto.getRandomValues(b);
	return `s_${[...b].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
}

export const onRequestPost: PagesFunction = async ({
	request,
	env,
	params,
}) => {
	const problemId = readProblemId(request, params as any);
	if (!problemId)
		return httpError("INVALID_ARGUMENT", "problemId required", 400);

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

	let body: { code?: string };
	try {
		body = await readJson(request);
	} catch (e) {
		return e as Response;
	}
	const code = String(body.code ?? "");
	if (!code.trim()) return httpError("INVALID_ARGUMENT", "code required", 400);

	const uid = await userIdFromEmail(email);
	const sidStr = id();
	const now = Math.floor(Date.now() / 1000);

	try {
		await env.DB.prepare(
			"INSERT INTO submissions (submission_id,user_id,problem_id,code,status,created_at) VALUES (?1,?2,?3,?4,?5,?6)",
		)
			.bind(sidStr, uid, problemId, code, "queued", now)
			.run();
	} catch (e) {
		if (isProd(env)) return httpError("INTERNAL", "database error", 500);
		return httpError("INTERNAL", String(e));
	}

	return httpJson(
		{
			ok: true,
			data: {
				submissionId: sidStr,
				userId: uid,
				problemId,
				status: "queued",
				createdAt: now,
			},
		},
		201,
	);
};
