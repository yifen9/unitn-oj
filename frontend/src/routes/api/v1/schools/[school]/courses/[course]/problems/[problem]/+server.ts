import { assertDb } from "$lib/api/d1";
import { getBindings } from "$lib/api/env";
import { ensureAcceptsJson, ok, problemFrom, withTrace } from "$lib/api/http";
import { getProblemBySlugs } from "$lib/api/problems";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async (event) => {
	try {
		ensureAcceptsJson(event.request);
		const { DB } = getBindings(event);
		assertDb(DB);
		const school = event.params.school ?? "";
		const course = event.params.course ?? "";
		const problem = event.params.problem ?? "";
		if (!school || !course || !problem) {
			return withTrace(
				problemFrom("INVALID_ARGUMENT", { detail: "missing slugs" }),
				event.request,
			);
		}
		const row = await getProblemBySlugs(DB, school, course, problem);
		if (!row) {
			return withTrace(
				problemFrom("NOT_FOUND", { detail: "problem not found" }),
				event.request,
			);
		}
		const data = {
			id: row.id,
			slug: row.slug,
			name: row.name,
			description: row.description,
			limits: {
				language: JSON.parse(row.language_limit),
				codeSizeByte: row.code_size_limit_byte,
				timeLimitMs: row.time_limit_ms,
				memoryLimitByte: row.memory_limit_byte,
			},
			artifact: row.artifact ? JSON.parse(row.artifact) : null,
			updated_at_s: row.updated_at_s,
		};
		return withTrace(ok({ ok: true, data }), event.request);
	} catch (e) {
		if (e instanceof Response) return withTrace(e, event.request);
		return withTrace(
			problemFrom("INTERNAL", { detail: "unexpected error" }),
			event.request,
		);
	}
};
