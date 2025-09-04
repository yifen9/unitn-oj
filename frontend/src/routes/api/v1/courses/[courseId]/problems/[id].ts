import { isProd } from "../../../../../../lib/api/env";
import { httpError, httpJson } from "../../../../../../lib/api/http";

function readIds(req: Request, params: Record<string, string> | undefined) {
	const cp = params?.courseId;
	const pid = params?.id;
	if (cp && pid) return { courseId: cp, id: pid };
	const m = new URL(req.url).pathname.match(
		/\/api\/v1\/courses\/([^/]+)\/problems\/([^/]+)$/,
	);
	return m
		? { courseId: decodeURIComponent(m[1]), id: decodeURIComponent(m[2]) }
		: { courseId: "", id: "" };
}

export const onRequestGet: PagesFunction = async ({ request, env, params }) => {
	const { courseId, id } = readIds(request, params as any);
	if (!courseId || !id)
		return httpError("INVALID_ARGUMENT", "courseId and id required", 400);
	try {
		const row = await env.DB.prepare(
			"SELECT p.problem_id AS problemId, ?1 AS courseId, p.title AS title, p.description AS description " +
				"FROM problems p WHERE p.problem_id=?2 AND EXISTS (SELECT 1 FROM course_problems cp WHERE cp.course_id=?1 AND cp.problem_id=?2)",
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
