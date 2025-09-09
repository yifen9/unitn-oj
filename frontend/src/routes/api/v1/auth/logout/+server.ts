import { logAuthEvent } from "$lib/api/audit";
import { buildSessionClearCookie } from "$lib/api/cookies";
import {
	getBindings,
	getOptionalString,
	getRequired,
	isProdFrom,
} from "$lib/api/env";
import { ok, withTrace } from "$lib/api/http";
import { clientIp, userAgent } from "$lib/api/request";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async (event) => {
	const { DB, APP_ENV } = getBindings(event);
	const prod = isProdFrom({ DB, APP_ENV });
	const setCookie = buildSessionClearCookie("sid", prod);
	try {
		const envAll = (event.platform?.env ?? {}) as Record<string, unknown>;
		const hashKey = prod
			? getRequired(envAll, "LOG_HASH_KEY")
			: getOptionalString(envAll, "LOG_HASH_KEY", "dev");
		const ip = clientIp(event.request);
		const ua = userAgent(event.request);
		if (DB) await logAuthEvent(DB, hashKey, "logout", null, ip, ua);
	} catch {}
	const accept = event.request.headers.get("accept") ?? "";
	if (/\btext\/html\b/i.test(accept)) {
		const h = new Headers();
		h.set("location", "/");
		h.append("set-cookie", setCookie);
		return withTrace(
			new Response(null, { status: 303, headers: h }),
			event.request,
		);
	}
	return withTrace(
		ok({ ok: true }, { "set-cookie": setCookie }),
		event.request,
	);
};
