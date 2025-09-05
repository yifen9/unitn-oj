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
import { httpError, httpJson, readJson } from "../../../../../../lib/api/http";

function randomId() {
	const b = new Uint8Array(8);
	crypto.getRandomValues(b);
	return `s_${[...b].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
}

export const POST: RequestHandler = async (event) => {
	const env = event.platform.env as any;
	const problemId = event.params.id || "";
	if (!problemId)
		return httpError("INVALID_ARGUMENT", "problemId required", 400);

	const sid = readSidFromCookie(event.request);
	if (!sid) return httpError("UNAUTHENTICATED", "sid cookie required", 401);

	const ttl = getOptionalNumber(env, "AUTH_SESSION_TTL_SECONDS", 7 * 24 * 3600);
	const secret = getRequired(env, "AUTH_SESSION_SECRET");

	let email = "";
	try {
		const s = await verifySession(secret, sid, ttl);
		email = s.email;
	} catch {
		return httpError("UNAUTHENTICATED", "invalid or expired session", 401);
	}

	let body: { code?: string };
	try {
		body = await readJson(event.request);
	} catch (e) {
		return e as Response;
	}
	const code = String(body.code ?? "");
	if (!code.trim()) return httpError("INVALID_ARGUMENT", "code required", 400);

	const userId = await userIdFromEmail(email);
	const submissionId = randomId();
	const now = Math.floor(Date.now() / 1000);

	try {
		await env.DB.prepare(
			"INSERT INTO submissions (submission_id,user_id,problem_id,code,status,created_at) VALUES (?1,?2,?3,?4,?5,?6)",
		)
			.bind(submissionId, userId, problemId, code, "queued", now)
			.run();
	} catch (e) {
		if (isProd(env)) return httpError("INTERNAL", "database error", 500);
		return httpError("INTERNAL", String(e));
	}

	try {
		await env.QUEUE_SUBMISSIONS.send({
			submissionId,
			problemId,
			userId,
			createdAt: now,
		});
	} catch {
		if (isProd(env)) return httpError("INTERNAL", "queue error", 500);
		return httpError("INTERNAL", "queue error", 500);
	}

	return httpJson(
		{
			ok: true,
			data: {
				submissionId,
				userId,
				problemId,
				status: "queued",
				createdAt: now,
			},
		},
		201,
	);
};
