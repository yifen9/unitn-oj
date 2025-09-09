import { getBindings } from "$lib/api/env";
import { ensureAcceptsJson, ok, problem, withTrace } from "$lib/api/http";
import type { RequestHandler } from "./$types";

async function checkDb(db: D1Database | undefined): Promise<"ok" | "skipped"> {
	if (!db) return "skipped";
	await db.prepare("SELECT 1").first();
	return "ok";
}

export const GET: RequestHandler = async (event) => {
	try {
		ensureAcceptsJson(event.request);
		const { DB, APP_ENV } = getBindings(event);
		const db = await checkDb(DB);
		const resp = ok({
			status: "ok",
			checks: { db },
			env: APP_ENV,
			now: new Date().toISOString(),
		});
		return withTrace(resp, event.request);
	} catch (e) {
		if (e instanceof Response) return withTrace(e, event.request);
		return withTrace(
			problem(503, "Service Unavailable", "database connectivity check failed"),
			event.request,
		);
	}
};

export const HEAD: RequestHandler = async (event) => {
	try {
		ensureAcceptsJson(event.request);
		const { DB } = getBindings(event);
		await checkDb(DB);
		return withTrace(
			new Response(null, {
				status: 200,
				headers: { "cache-control": "no-store" },
			}),
			event.request,
		);
	} catch (e) {
		if (e instanceof Response) {
			return withTrace(
				new Response(null, {
					status: e.status,
					headers: {
						"cache-control": "no-store",
						"content-type": "application/problem+json",
					},
				}),
				event.request,
			);
		}
		return withTrace(
			new Response(null, {
				status: 503,
				headers: { "cache-control": "no-store" },
			}),
			event.request,
		);
	}
};
