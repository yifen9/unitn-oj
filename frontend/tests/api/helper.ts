//import type { RequestEvent } from "@sveltejs/kit";

export type DbMode = "ok" | "error" | "none";

export function makeRequest(
	url = "http://localhost/api/health",
	init: RequestInit = {},
): Request {
	const headers = new Headers(init.headers ?? {});
	if (!headers.has("accept")) headers.set("accept", "application/json");
	return new Request(url, { ...init, headers });
}

type ParamShape = Record<string, string | undefined>;

type MakeInit<P> = {
	appEnv?: string;
	req?: Request;
	params?: P;
};

export type EventParams<E> = E extends { params: infer P } ? P : ParamShape;

export type EventRouteId<E> = E extends { route: { id: infer R } }
	? R
	: string | null;

export function eventFactoryForEvent<E>(routeId: EventRouteId<E>) {
	return (mode: DbMode, init?: MakeInit<EventParams<E>>): E => {
		const DB: D1Database | undefined =
			mode === "none"
				? undefined
				: ({
						prepare: () => ({
							first: async () => {
								if (mode === "error") throw new Error("boom");
								return { one: 1 };
							},
						}),
					} as unknown as D1Database);

		const request = init?.req ?? makeRequest();
		const ev = {
			request,
			url: new URL(request.url),
			params: (init?.params ?? ({} as ParamShape)) as EventParams<E>,
			locals: {},
			route: { id: routeId },
			platform: { env: { DB, APP_ENV: init?.appEnv ?? "unknown" } },
			fetch,
			getClientAddress: () => "127.0.0.1",
			setHeaders: () => {},
			depends: () => {},
			isDataRequest: false,
		};
		return ev as unknown as E;
	};
}

export interface ProblemDoc {
	type: string;
	title: string;
	status: number;
	detail?: string;
	instance?: string;
	[k: string]: unknown;
}

export async function jsonOf<T = unknown>(res: Response): Promise<T> {
	const ct = res.headers.get("content-type") ?? "";
	if (!/application\/json|application\/problem\+json/i.test(ct)) {
		const txt = await res.text();
		throw new Error(`expected JSON; got ${ct}; body=${txt}`);
	}
	return (await res.json()) as T;
}

export async function expectProblem(
	res: Response,
	status: number,
	opts: { title?: string; detailIncludes?: string } = {},
) {
	const body = await jsonOf<ProblemDoc>(res);
	if (res.status !== status)
		throw new Error(`expected ${status} got ${res.status}`);
	if (
		!/application\/problem\+json/i.test(res.headers.get("content-type") ?? "")
	)
		throw new Error("wrong content-type");
	if (opts.title && body.title !== opts.title)
		throw new Error("title mismatch");
	if (
		opts.detailIncludes &&
		!String(body.detail ?? "").includes(opts.detailIncludes)
	)
		throw new Error("detail mismatch");
}

export function expectTraceparentEcho(res: Response, req: Request) {
	const reqTrace = req.headers.get("traceparent");
	const respTrace = res.headers.get("traceparent");
	if (!respTrace) throw new Error("missing traceparent");
	if (reqTrace && respTrace !== reqTrace)
		throw new Error("traceparent not echoed");
	if (!reqTrace && !/^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/.test(respTrace))
		throw new Error("traceparent format");
}
