import { verifySession } from "$lib/api/auth/session";
import { getCookie } from "$lib/api/cookies";
import { assertDb } from "$lib/api/d1";
import { getBindings, getRequired } from "$lib/api/env";
import {
	created,
	ensureAcceptsJson,
	ok,
	problemFrom,
	readJson,
	withTrace,
} from "$lib/api/http";
import { getCursor, getLimit } from "$lib/api/pagination";
import { getProblemLimits } from "$lib/api/problems";
import { sendSubmissionJob } from "$lib/api/queues";
import {
	createSubmission,
	listSubmissionsByProblem,
} from "$lib/api/submissions";
import { getUserByEmail } from "$lib/api/users";
import type { RequestHandler } from "./$types";

type Body = { code?: string; language?: string };

export const GET: RequestHandler = async (event) => {
	try {
		ensureAcceptsJson(event.request);
		const { DB } = getBindings(event);
		assertDb(DB);
		const pid = String(event.params.id ?? "").trim();
		if (!pid) throw problemFrom("NOT_FOUND", { detail: "problem not found" });
		const url = new URL(event.request.url);
		const limit = getLimit(url);
		const cursor = getCursor(url);
		const { items, nextCursor } = await listSubmissionsByProblem(
			DB,
			pid,
			limit,
			cursor,
		);
		return withTrace(
			ok({ ok: true as const, data: { items, nextCursor } }),
			event.request,
		);
	} catch (e) {
		if (e instanceof Response) return withTrace(e, event.request);
		return withTrace(
			problemFrom("INTERNAL", { detail: "unexpected error" }),
			event.request,
		);
	}
};

export const POST: RequestHandler = async (event) => {
	try {
		ensureAcceptsJson(event.request);
		const { DB } = getBindings(event);
		assertDb(DB);
		const envAll = (event.platform?.env ?? {}) as Record<string, unknown>;
		const secret = getRequired(envAll, "AUTH_SESSION_SECRET");
		const sid = getCookie(event.request, "sid") ?? "";
		if (!sid)
			throw problemFrom("UNAUTHENTICATED", { detail: "missing session" });
		const email = await verifySession(secret, sid);
		if (!email)
			throw problemFrom("UNAUTHENTICATED", { detail: "invalid session" });
		const me = await getUserByEmail(DB, email);
		if (!me) throw problemFrom("UNAUTHENTICATED", { detail: "user not found" });
		const problemId = String(event.params.id ?? "").trim();
		if (!problemId)
			throw problemFrom("NOT_FOUND", { detail: "problem not found" });
		const body = await readJson<Body>(event.request);
		const code = String(body.code ?? "");
		const language = String(body.language ?? "").trim();
		if (!code || !language)
			throw problemFrom("INVALID_ARGUMENT", {
				detail: "code and language required",
			});
		const p = await getProblemLimits(DB, problemId);
		if (!p) throw problemFrom("NOT_FOUND", { detail: "problem not found" });
		if (
			Array.isArray(p.language_limit) &&
			!p.language_limit.includes(language)
		) {
			throw problemFrom("INVALID_ARGUMENT", { detail: "language not allowed" });
		}
		const size = new TextEncoder().encode(code).length;
		if (size > p.code_size_limit_byte) {
			throw problemFrom("FAILED_PRECONDITION", { detail: "code too large" });
		}
		const sub = await createSubmission(DB, {
			user_id: me.id,
			problem_id: problemId,
			language,
			code,
			code_size_byte: size,
		});
		const queue = (
			envAll as unknown as { QUEUE?: { send: (m: unknown) => Promise<void> } }
		).QUEUE;
		if (!queue) throw problemFrom("INTERNAL", { detail: "queue unavailable" });
		await sendSubmissionJob(queue, {
			submission_id: sub.id,
			problem_id: problemId,
			language,
			code,
			limits: { time_ms: p.time_limit_ms, memory_byte: p.memory_limit_byte },
		});
		const loc = `/api/v1/submissions/${sub.id}`;
		return withTrace(
			created(loc, {
				ok: true as const,
				data: {
					id: sub.id,
					problemId,
					userId: me.id,
					status: sub.status,
					language,
					codeSizeByte: sub.code_size_byte,
					createdAt: sub.created_at_s,
				},
			}),
			event.request,
		);
	} catch (e) {
		if (e instanceof Response) return withTrace(e, event.request);
		return withTrace(
			problemFrom("INTERNAL", { detail: "unexpected error" }),
			event.request,
		);
	}
};
