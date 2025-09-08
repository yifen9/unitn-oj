import { getBindings } from "$lib/api/env";
import { ok, problem } from "$lib/api/http";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async (event) => {
	try {
		const { DB, APP_ENV } = getBindings(event);
		if (DB) await DB.prepare("SELECT 1").first();
		return ok({
			status: "ok",
			checks: { db: DB ? "ok" : "skipped" },
			env: APP_ENV,
			now: new Date().toISOString(),
		});
	} catch {
		return problem(
			503,
			"Service Unavailable",
			"database connectivity check failed",
		);
	}
};
