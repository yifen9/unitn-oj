import { assertDb } from "$lib/api/d1";
import { getBindings } from "$lib/api/env";
import { ensureAcceptsJson, ok, problemFrom, withTrace } from "$lib/api/http";
import { getCursor, getLimit } from "$lib/api/pagination";
import { listPublicUsers } from "$lib/api/users";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async (event) => {
	try {
		ensureAcceptsJson(event.request);
		const { DB } = getBindings(event);
		assertDb(DB);
		const url = new URL(event.request.url);
		const limit = getLimit(url);
		const cursor = getCursor(url);
		const { items, nextCursor } = await listPublicUsers(DB, limit, cursor);
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
