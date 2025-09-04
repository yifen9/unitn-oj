import type { RequestHandler } from "@sveltejs/kit";
import { isProd } from "$lib/api/env";
import { httpError, httpJson } from "$lib/api/http";

export const GET: RequestHandler = async (event) => {
	const env = event.platform.env as any;
	const courseId = event.params.courseId || "";
	const id = event.params.id || "";
	if (!courseId || !id) {
		return httpError("INVALID_ARGUMENT", "courseId and id required", 400);
	}

	try {
		const row = await env.DB.prepare(
			"SELECT p.problem_id AS problemId, ?1 AS courseId, p.title AS title, p.description AS description " +
				"FROM problems p WHERE p.problem_id=?2 AND EXISTS (" +
				"SELECT 1 FROM course_problems cp WHERE cp.course_id=?1 AND cp.problem_id=?2)",
		)
			.bind(courseId, id)
			.first<{
				problemId: string;
				courseId: string;
				title: string;
				description: string | null;
			}>();

		if (!row) return httpError("NOT_FOUND", "problem not found", 404);
		return httpJson({ ok: true, data: row });
	} catch (e) {
		if (isProd(env)) return httpError("INTERNAL", "database error", 500);
		return httpError("INTERNAL", String(e));
	}
};
