import { json } from "@sveltejs/kit";

export function ok<T>(body: T, headers: HeadersInit = {}) {
	return json(body, {
		status: 200,
		headers: { "cache-control": "no-store", ...headers },
	});
}

export function created<T>(
	location: string,
	body: T,
	headers: HeadersInit = {},
) {
	return json(body, {
		status: 201,
		headers: { Location: location, "cache-control": "no-store", ...headers },
	});
}

export function accepted<T>(
	location: string,
	body: T,
	headers: HeadersInit = {},
) {
	return json(body, {
		status: 202,
		headers: { Location: location, "cache-control": "no-store", ...headers },
	});
}

export function noContent(headers: HeadersInit = {}) {
	return new Response(null, { status: 204, headers });
}

export const ERROR_KINDS = {
	INVALID_ARGUMENT: {
		http: 400,
		grpc: "INVALID_ARGUMENT",
		title: "Invalid argument",
		type: "https://oj.yifen9.li/problems/invalid-argument",
	},
	UNAUTHENTICATED: {
		http: 401,
		grpc: "UNAUTHENTICATED",
		title: "Unauthenticated",
		type: "https://oj.yifen9.li/problems/unauthenticated",
	},
	PERMISSION_DENIED: {
		http: 403,
		grpc: "PERMISSION_DENIED",
		title: "Permission denied",
		type: "https://oj.yifen9.li/problems/permission-denied",
	},
	NOT_FOUND: {
		http: 404,
		grpc: "NOT_FOUND",
		title: "Not found",
		type: "https://oj.yifen9.li/problems/not-found",
	},
	FAILED_PRECONDITION: {
		http: 412,
		grpc: "FAILED_PRECONDITION",
		title: "Failed precondition",
		type: "https://oj.yifen9.li/problems/failed-precondition",
	},
	RESOURCE_EXHAUSTED: {
		http: 429,
		grpc: "RESOURCE_EXHAUSTED",
		title: "Rate limit exceeded",
		type: "https://oj.yifen9.li/problems/rate-limit",
	},
	INTERNAL: {
		http: 500,
		grpc: "INTERNAL",
		title: "Internal error",
		type: "https://oj.yifen9.li/problems/internal",
	},
} as const;
export type ErrorKind = keyof typeof ERROR_KINDS;

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

export function problemFrom(
	kind: ErrorKind,
	o?: {
		detail?: string;
		instance?: string;
		violations?: Array<{ field: string; description: string }>;
	},
) {
	const k = ERROR_KINDS[kind];
	return new Response(
		JSON.stringify({
			type: k.type,
			title: k.title,
			status: k.http,
			detail: o?.detail,
			instance: o?.instance,
			grpc_status: k.grpc,
			violations: o?.violations,
		}),
		{
			status: k.http,
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
		throw problemFrom("INVALID_ARGUMENT", {
			detail: "content-type must be application/json or *+json",
		});
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
		throw problemFrom("INVALID_ARGUMENT", { detail: "invalid JSON body" });
	}
}

export function withTrace(resp: Response, req: Request) {
	const trace = req.headers.get("traceparent") ?? genTraceparent();
	const h = new Headers(resp.headers);
	if (!h.has("traceparent")) h.set("traceparent", trace);
	return new Response(resp.body, {
		status: resp.status,
		statusText: resp.statusText,
		headers: h,
	});
}

function genTraceparent(): string {
	const randHex = (n: number) =>
		[...crypto.getRandomValues(new Uint8Array(n))]
			.map((b) => b.toString(16).padStart(2, "0"))
			.join("");
	return `00-${randHex(16)}-${randHex(8)}-01`;
}
