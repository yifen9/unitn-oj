import { isProd } from "../../../../../lib/api/env";

export const onRequestPost: PagesFunction = async ({ request, env }) => {
	const prod = isProd(env);
	const headers = new Headers();
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

	const accept = request.headers.get("accept") || "";
	if (/\btext\/html\b/i.test(accept)) {
		headers.set("location", "/");
		return new Response(null, { status: 303, headers });
	}

	headers.set("content-type", "application/json");
	return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
};
