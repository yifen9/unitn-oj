import { assertDb } from "$lib/api/d1";
import { getBindings } from "$lib/api/env";
import { strongEtagOf } from "$lib/api/etag";
import { ensureAcceptsJson, ok, problemFrom, withTrace } from "$lib/api/http";
import { getPublicUserBySlug } from "$lib/api/users";
import type { RequestHandler } from "./$types";

function cacheHeaders(etag: string, maxAge: number) {
	return {
		ETag: etag,
		"Cache-Control": `public, max-age=${maxAge}, must-revalidate`,
	};
}

export const GET: RequestHandler = async (event) => {
	try {
		ensureAcceptsJson(event.request);
		const { params } = event;
		const slug = String(params.slug ?? "").trim();
		const { DB } = getBindings(event);
		assertDb(DB);
		if (!slug) throw problemFrom("NOT_FOUND", { detail: "user not found" });
		const u = await getPublicUserBySlug(DB, slug);
		if (!u) throw problemFrom("NOT_FOUND", { detail: "user not found" });
		const etag = await strongEtagOf([u.id, u.updated_at_s]);
		const inm = event.request.headers.get("if-none-match");
		if (
			inm
				?.split(",")
				.map((s) => s.trim())
				.includes(etag)
		) {
			return withTrace(
				new Response(null, { status: 304, headers: cacheHeaders(etag, 300) }),
				event.request,
			);
		}
		const body = {
			ok: true as const,
			data: {
				id: u.id,
				slug: u.slug,
				name: u.name,
				description: u.description,
			},
		};
		return withTrace(ok(body, cacheHeaders(etag, 300)), event.request);
	} catch (e) {
		if (e instanceof Response) return withTrace(e, event.request);
		return withTrace(
			problemFrom("INTERNAL", { detail: "unexpected error" }),
			event.request,
		);
	}
};

export const HEAD: RequestHandler = async (event) => {
	try {
		ensureAcceptsJson(event.request);
		const { params } = event;
		const slug = String(params.slug ?? "").trim();
		const { DB } = getBindings(event);
		assertDb(DB);
		if (!slug)
			return withTrace(new Response(null, { status: 404 }), event.request);
		const u = await getPublicUserBySlug(DB, slug);
		if (!u)
			return withTrace(new Response(null, { status: 404 }), event.request);
		const etag = await strongEtagOf([u.id, u.updated_at_s]);
		const inm = event.request.headers.get("if-none-match");
		if (
			inm
				?.split(",")
				.map((s) => s.trim())
				.includes(etag)
		) {
			return withTrace(
				new Response(null, { status: 304, headers: cacheHeaders(etag, 300) }),
				event.request,
			);
		}
		return withTrace(
			new Response(null, { status: 200, headers: cacheHeaders(etag, 300) }),
			event.request,
		);
	} catch {
		return withTrace(new Response(null, { status: 500 }), event.request);
	}
};
