import { verifySession } from "$lib/api/auth/session";
import { getCookie } from "$lib/api/cookies";
import { assertDb } from "$lib/api/d1";
import { getBindings, getRequired } from "$lib/api/env";
import { ensureAcceptsJson, ok, problemFrom, withTrace } from "$lib/api/http";
import { getUserByEmail } from "$lib/api/users";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async (event) => {
	try {
		ensureAcceptsJson(event.request);
		const { DB } = getBindings(event);
		assertDb(DB);
		const envAll = (event.platform?.env ?? {}) as Record<string, unknown>;
		const secret = getRequired(envAll, "AUTH_SESSION_SECRET");
		const sid = getCookie(event.request, "sid") ?? "";
		if (!sid)
			throw problemFrom("UNAUTHENTICATED", { detail: "missing session" });
		const email = await verifySession(secret, sid);
		if (!email)
			throw problemFrom("UNAUTHENTICATED", { detail: "invalid session" });
		const u = await getUserByEmail(DB, email);
		if (!u) throw problemFrom("UNAUTHENTICATED", { detail: "user not found" });
		const body = {
			ok: true as const,
			data: {
				id: u.id,
				slug: u.slug,
				email: u.email,
				name: u.name,
				description: u.description,
				is_active: !!u.is_active,
			},
		};
		return withTrace(ok(body), event.request);
	} catch (e) {
		if (e instanceof Response) return withTrace(e, event.request);
		return withTrace(
			problemFrom("INTERNAL", { detail: "unexpected error" }),
			event.request,
		);
	}
};
