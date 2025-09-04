import { isProd } from "../../../../../../../lib/api/env";
import { httpError, httpJson } from "../../../../../../../lib/api/http";

function readCourseId(
	req: Request,
	params: Record<string, string> | undefined,
) {
	const p = params?.courseId;
	if (p) return p;
	const m = new URL(req.url).pathname.match(
		/\/api\/v1\/courses\/([^/]+)\/problems\/?$/,
	);
	return m ? decodeURIComponent(m[1]) : "";
}

export const onRequestGet: PagesFunction = async ({ request, env, params }) => {
	const courseId = readCourseId(request, params as any);
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
