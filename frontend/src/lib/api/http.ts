import { json } from "@sveltejs/kit";

export function ok<T>(body: T, headers: HeadersInit = {}) {
	return json(body, {
		status: 200,
		headers: { "cache-control": "no-store", ...headers },
	});
}
export function created<T>(location: string, body: T) {
	return json(body, {
		status: 201,
		headers: { Location: location, "cache-control": "no-store" },
	});
}
export function accepted<T>(location: string, body: T) {
	return json(body, {
		status: 202,
		headers: { Location: location, "cache-control": "no-store" },
	});
}
export function noContent(headers: HeadersInit = {}) {
	return new Response(null, { status: 204, headers });
}

export function problem(
	status: number,
	title: string,
	detail?: string,
	extra?: Record<string, unknown>,
) {
	return new Response(
		JSON.stringify({ type: "about:blank", title, status, detail, ...extra }),
		{
			status,
			headers: {
				"content-type": "application/problem+json",
				"cache-control": "no-store",
			},
		},
	);
}

export function ensureJsonContentType(req: Request) {
	const ct = req.headers.get("content-type") ?? "";
	if (!/application\/json|[a-z0-9.+-]+\/[a-z0-9.+-]+\+json/i.test(ct)) {
		throw problem(
			415,
			"Unsupported Media Type",
			"content-type must be application/json or *+json",
		);
	}
}
export function ensureAcceptsJson(req: Request) {
	const accept = req.headers.get("accept");
	if (accept && !/\b(\*\/\*|application\/json)\b/i.test(accept)) {
		throw problem(
			406,
			"Not Acceptable",
			"client does not accept application/json",
		);
	}
}
export async function readJson<T = unknown>(req: Request): Promise<T> {
	ensureJsonContentType(req);
	ensureAcceptsJson(req);
	try {
		return (await req.json()) as T;
	} catch {
		throw problem(400, "Bad Request", "invalid JSON body");
	}
}
