import { assertDb } from "$lib/api/d1";
import { getBindings } from "$lib/api/env";
import { ensureAcceptsJson, ok, problemFrom, withTrace } from "$lib/api/http";
import { listProblemsByCourseSlugs } from "$lib/api/problems";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async (event) => {
	try {
		ensureAcceptsJson(event.request);
		const { DB } = getBindings(event);
		assertDb(DB);
		const school = event.params.school ?? "";
		const course = event.params.course ?? "";
		if (!school || !course) {
			return withTrace(
				problemFrom("INVALID_ARGUMENT", { detail: "missing slugs" }),
				event.request,
			);
		}
		const url = new URL(event.request.url);
		const limit = Math.max(
			1,
			Math.min(100, Number(url.searchParams.get("limit") ?? 50)),
		);
		const items = await listProblemsByCourseSlugs(DB, school, course, limit);
		return withTrace(ok({ ok: true, data: items }), event.request);
	} catch (e) {
		if (e instanceof Response) return withTrace(e, event.request);
		return withTrace(
			problemFrom("INTERNAL", { detail: "unexpected error" }),
			event.request,
		);
	}
};
