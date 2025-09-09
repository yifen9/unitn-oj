import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ fetch }) => {
	const r = await fetch("/api/v1/auth/logout", {
		method: "POST",
		headers: { accept: "application/json" },
	});
	const h = new Headers({ Location: "/" });
	const set = r.headers.get("set-cookie");
	if (set) h.append("set-cookie", set);
	return new Response(null, { status: 303, headers: h });
};
