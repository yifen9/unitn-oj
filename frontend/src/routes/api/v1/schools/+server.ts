import type { RequestHandler } from "@sveltejs/kit";
import { isProd } from "../../../../lib/api/env";
import { httpError, httpJson } from "../../../../lib/api/http";

export const GET: RequestHandler = async (event) => {
	const env = event.platform.env as any;
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
