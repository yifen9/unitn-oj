import { assertDb } from "$lib/api/d1";
import { getBindings } from "$lib/api/env";
import { ensureAcceptsJson, ok, problemFrom, withTrace } from "$lib/api/http";
import { getSchoolBySlug } from "$lib/api/schools";
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
		const row = await getSchoolBySlug(DB, school);
		if (!row) {
			return withTrace(
				problemFrom("NOT_FOUND", { detail: "school not found" }),
				event.request,
			);
		}
		return withTrace(ok({ ok: true, data: row }), event.request);
	} catch (e) {
		if (e instanceof Response) return withTrace(e, event.request);
		return withTrace(
			problemFrom("INTERNAL", { detail: "unexpected error" }),
			event.request,
		);
	}
};
