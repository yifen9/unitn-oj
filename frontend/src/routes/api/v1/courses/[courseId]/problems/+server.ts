import type { RequestHandler } from "@sveltejs/kit";
import { isProd } from "../../../../../../lib/api/env";
import { httpError, httpJson } from "../../../../../../lib/api/http";

export const GET: RequestHandler = async (event) => {
	const env = event.platform.env as any;
	const courseId = event.params.courseId || "";
	if (!courseId) return httpError("INVALID_ARGUMENT", "courseId required", 400);

	try {
		const r = await env.DB.prepare(
			"SELECT p.problem_id AS problemId, p.title AS title " +
				"FROM course_problems cp JOIN problems p ON p.problem_id=cp.problem_id " +
				"WHERE cp.course_id=?1 ORDER BY cp.ordinal ASC, p.title ASC",
		)
			.bind(courseId)
			.all();

		return httpJson({ ok: true, data: r.results });
	} catch (e) {
		if (isProd(env)) return httpError("INTERNAL", "database error", 500);
		return httpError("INTERNAL", String(e));
	}
};
