import { assertDb } from "$lib/api/d1";
import { getBindings } from "$lib/api/env";
import { ensureAcceptsJson, ok, problemFrom, withTrace } from "$lib/api/http";
import { getSubmissionById } from "$lib/api/submissions";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async (event) => {
	try {
		ensureAcceptsJson(event.request);
		const { DB } = getBindings(event);
		assertDb(DB);
		const id = String((event.params as { id?: string }).id ?? "").trim();
		if (!id) throw problemFrom("NOT_FOUND", { detail: "submission not found" });
		const s = await getSubmissionById(DB, id);
		if (!s) throw problemFrom("NOT_FOUND", { detail: "submission not found" });
		return withTrace(
			ok({
				ok: true as const,
				data: {
					id: s.id,
					problemId: s.problem_id,
					userId: s.user_id,
					status: s.status,
					language: s.language,
					code: s.code,
					codeSizeByte: s.code_size_byte,
					runTimeMs: s.run_time_ms,
					runMemoryByte: s.run_memory_byte,
					createdAt: s.created_at_s,
					updatedAt: s.updated_at_s,
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
