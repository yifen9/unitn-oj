import type { RequestHandler } from "@sveltejs/kit";
import { isProd } from "../../../../../lib/api/env";
import { httpError, httpJson } from "../../../../../lib/api/http";

export const GET: RequestHandler = async (event) => {
	const env = event.platform.env as any;
	const id = event.params.id || "";
	if (!id) return httpError("INVALID_ARGUMENT", "id required", 400);

	try {
		const row = await env.DB.prepare(
			"SELECT course_id as courseId, school_id as schoolId, name FROM courses WHERE course_id=?1",
		)
			.bind(id)
			.first<{ courseId: string; schoolId: string; name: string }>();

		if (!row) return httpError("NOT_FOUND", "course not found", 404);
		return httpJson({ ok: true, data: row });
	} catch (e) {
		if (isProd(env)) return httpError("INTERNAL", "database error", 500);
		return httpError("INTERNAL", String(e));
	}
};
