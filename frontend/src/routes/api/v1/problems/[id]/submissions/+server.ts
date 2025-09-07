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
import { createQueued } from "../../../../../../lib/data/submissions";

function randomId() {
	const b = new Uint8Array(8);
	crypto.getRandomValues(b);
	return `S_${[...b].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
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
		email = (await verifySession(secret, sid, ttl)).email;
	} catch {
		return httpError("UNAUTHENTICATED", "invalid or expired session", 401);
	}

	let body: { code?: string; language?: string } = {};
	try {
		body = await readJson(event.request);
	} catch (e) {
		return e as Response;
	}
	const code = String(body.code ?? "");
	if (!code.trim()) return httpError("INVALID_ARGUMENT", "code required", 400);

	const userId = await userIdFromEmail(email);
	const now = Math.floor(Date.now() / 1000);
	const submissionId = randomId();

	try {
		const dto = await createQueued(env, {
			submissionId,
			userId,
			problemId,
			code,
			language: body.language,
			now,
		});
		return httpJson({ ok: true, data: dto }, 201);
	} catch (e) {
		if (isProd(env))
			return httpError("INTERNAL", "database or queue error", 500);
		return httpError("INTERNAL", String(e));
	}
};
