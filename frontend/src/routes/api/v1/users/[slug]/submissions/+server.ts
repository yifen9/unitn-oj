import { assertDb } from "$lib/api/d1";
import { getBindings } from "$lib/api/env";
import { ensureAcceptsJson, ok, problemFrom, withTrace } from "$lib/api/http";
import { getCursor, getLimit } from "$lib/api/pagination";
import { listSubmissionsByUserId } from "$lib/api/submissions";
import { getUserIdBySlug } from "$lib/api/users";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async (event) => {
	try {
		ensureAcceptsJson(event.request);
		const { DB } = getBindings(event);
		assertDb(DB);
		const slug = String(event.params.slug ?? "").trim();
		if (!slug) throw problemFrom("NOT_FOUND", { detail: "user not found" });
		const uid = await getUserIdBySlug(DB, slug);
		if (!uid) throw problemFrom("NOT_FOUND", { detail: "user not found" });
		const url = new URL(event.request.url);
		const limit = getLimit(url);
		const cursor = getCursor(url);
		const { items, nextCursor } = await listSubmissionsByUserId(
			DB,
			uid,
			limit,
			cursor,
		);
		return withTrace(
			ok({ ok: true as const, data: { items, nextCursor } }),
			event.request,
		);
	} catch (e) {
		if (e instanceof Response) return withTrace(e, event.request);
		return withTrace(
			problemFrom("INTERNAL", { detail: "unexpected error" }),
			event.request,
		);
	}
};
