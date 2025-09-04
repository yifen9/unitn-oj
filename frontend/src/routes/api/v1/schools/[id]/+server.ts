import { isProd } from "../../../../../lib/api/env";
import { httpError, httpJson } from "../../../../../lib/api/http";

function readId(req: Request, params: Record<string, string> | undefined) {
	const p = params?.id;
	if (p) return p;
	const m = new URL(req.url).pathname.match(/\/api\/v1\/schools\/([^/]+)$/);
	return m ? decodeURIComponent(m[1]) : "";
}

export const onRequestGet: PagesFunction = async ({ request, env, params }) => {
	const id = readId(request, params as any);
	if (!id) return httpError("INVALID_ARGUMENT", "id required", 400);
	try {
		const row = await env.DB.prepare(
			"SELECT school_id as schoolId, name FROM schools WHERE school_id=?1",
		)
			.bind(id)
			.first<{
				schoolId: string;
				name: string;
			}>();
		if (!row) return httpError("NOT_FOUND", "school not found", 404);
		return httpJson({ ok: true, data: row });
	} catch (e) {
		if (isProd(env)) return httpError("INTERNAL", "database error", 500);
		return httpError("INTERNAL", String(e));
	}
};
