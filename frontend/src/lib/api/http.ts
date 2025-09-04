export type ErrorCode =
	| "INVALID_ARGUMENT"
	| "FAILED_PRECONDITION"
	| "UNAUTHENTICATED"
	| "PERMISSION_DENIED"
	| "NOT_FOUND"
	| "RESOURCE_EXHAUSTED"
	| "INTERNAL";

const codeToStatus: Record<ErrorCode, number> = {
	INVALID_ARGUMENT: 400,
	FAILED_PRECONDITION: 412,
	UNAUTHENTICATED: 401,
	PERMISSION_DENIED: 403,
	NOT_FOUND: 404,
	RESOURCE_EXHAUSTED: 429,
	INTERNAL: 500,
};

export function httpJson(data: unknown, status = 200, headers?: HeadersInit) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { "content-type": "application/json", ...(headers ?? {}) },
	});
}

export function httpError(code: ErrorCode, message: string, status?: number) {
	const httpStatus = status ?? codeToStatus[code] ?? 500;
	return httpJson({ ok: false, error: { code, message } }, httpStatus);
}

export function ensureJsonContentType(req: Request) {
	const ct = req.headers.get("content-type") || "";
	if (!/application\/json|.+\+json/i.test(ct)) {
		throw httpError(
			"INVALID_ARGUMENT",
			"content-type must be application/json",
			415,
		);
	}
}

export async function readJson<T = any>(req: Request): Promise<T> {
	ensureJsonContentType(req);
	const raw = await req.text();
	try {
		return raw ? (JSON.parse(raw) as T) : ({} as T);
	} catch {
		throw httpError("INVALID_ARGUMENT", "invalid JSON body", 400);
	}
}
