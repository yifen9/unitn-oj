import type { RequestHandler } from "@sveltejs/kit";

export const GET: RequestHandler = async () => {
	return new Response(JSON.stringify({ ok: true }), {
		headers: { "content-type": "application/json" },
	});
};
