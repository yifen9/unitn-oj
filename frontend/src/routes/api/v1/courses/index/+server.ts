import { isProd } from "../../../../../lib/api/env";
import { httpError, httpJson } from "../../../../../lib/api/http";

export const onRequestGet: PagesFunction = async ({ request, env }) => {
	const url = new URL(request.url);
	const hasFilter = url.searchParams.has("schoolId");
	const schoolId = url.searchParams.get("schoolId") || "";
	if (hasFilter && !schoolId.trim())
		return httpError("INVALID_ARGUMENT", "schoolId must not be empty", 400);
	try {
		if (hasFilter) {
			const r = await env.DB.prepare(
				"SELECT course_id as courseId, school_id as schoolId, name FROM courses WHERE school_id=?1 ORDER BY name ASC",
			)
				.bind(schoolId)
				.all();
			return httpJson({ ok: true, data: r.results });
		} else {
			const r = await env.DB.prepare(
				"SELECT course_id as courseId, school_id as schoolId, name FROM courses ORDER BY name ASC",
			).all();
			return httpJson({ ok: true, data: r.results });
		}
	} catch (e) {
		if (isProd(env)) return httpError("INTERNAL", "database error", 500);
		return httpError("INTERNAL", String(e));
	}
};
