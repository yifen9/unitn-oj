import { isProd } from "../../../_lib/env";
import { httpError, httpJson } from "../../../_lib/http";

export const onRequestGet: PagesFunction = async ({ request, env }) => {
	try {
		const r = await env.DB.prepare(
			"SELECT school_id as schoolId, name FROM schools ORDER BY name ASC",
		).all();
		return httpJson({ ok: true, data: r.results });
	} catch (e) {
		if (isProd(env)) return httpError("INTERNAL", "database error", 500);
		return httpError("INTERNAL", String(e));
	}
};
