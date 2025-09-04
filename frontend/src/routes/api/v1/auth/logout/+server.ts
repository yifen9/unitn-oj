import type { RequestHandler } from "@sveltejs/kit";
import { isProd } from "$lib/api/env";

export const POST: RequestHandler = async (event) => {
	const prod = isProd(event.platform.env);
	const headers = new Headers();

	// 清除 cookie
	headers.append(
		"set-cookie",
		[
			"sid=",
			"Path=/",
			"HttpOnly",
			"SameSite=Lax",
			"Max-Age=0",
			prod ? "Secure" : "",
		]
			.filter(Boolean)
			.join("; "),
	);

	const accept = event.request.headers.get("accept") || "";
	if (/\btext\/html\b/i.test(accept)) {
		headers.set("location", "/");
		return new Response(null, { status: 303, headers });
	}

	headers.set("content-type", "application/json");
	return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
};
