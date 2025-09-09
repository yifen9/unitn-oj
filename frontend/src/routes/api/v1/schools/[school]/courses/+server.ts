import { listCoursesBySchoolSlug } from "$lib/api/courses";
import { assertDb } from "$lib/api/d1";
import { getBindings } from "$lib/api/env";
import { ensureAcceptsJson, ok, problemFrom, withTrace } from "$lib/api/http";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async (event) => {
	try {
		ensureAcceptsJson(event.request);
		const { DB } = getBindings(event);
		assertDb(DB);
		const school = event.params.school ?? "";
		if (!school) {
			return withTrace(
				problemFrom("INVALID_ARGUMENT", { detail: "missing school" }),
				event.request,
			);
		}
		const url = new URL(event.request.url);
		const limit = Math.max(
			1,
			Math.min(100, Number(url.searchParams.get("limit") ?? 50)),
		);
		const items = await listCoursesBySchoolSlug(DB, school, limit);
		return withTrace(ok({ ok: true, data: items }), event.request);
	} catch (e) {
		if (e instanceof Response) return withTrace(e, event.request);
		return withTrace(
			problemFrom("INTERNAL", { detail: "unexpected error" }),
			event.request,
		);
	}
};
