import { expect } from "bun:test";

export async function readJson(res: Response) {
	const text = await res.text();
	try {
		return JSON.parse(text);
	} catch {
		expect(text).toBe("");
		return null as any;
	}
}

export function makeD1Mock() {
	const state = {
		lastSQL: "",
		lastArgs: [] as any[],
		prepared: [] as string[],
		firstResult: undefined as any,
		allResults: [] as any[],
	};

	const stmt = {
		bind: (...args: any[]) => {
			state.lastArgs = args;
			return stmt;
		},
		first: async <T>() => state.firstResult as T,
		all: async <T>() => ({ results: (state.allResults as T[]) ?? [] }),
		run: async () => ({}),
	};

	const db = {
		prepare: (sql: string) => {
			state.lastSQL = sql;
			state.prepared.push(sql);
			return { ...stmt };
		},
	};

	return { db, state };
}

export function makeEvent(init: {
	url: string;
	method?: string;
	headers?: Record<string, string>;
	body?: string | Uint8Array;
	env?: Record<string, any>;
	params?: Record<string, string>;
}) {
	const req = new Request(init.url, {
		method: init.method ?? "GET",
		headers: init.headers,
		body: init.body,
	});
	const url = new URL(init.url);
	const platform = { env: init.env ?? {} } as any;

	const event = {
		request: req,
		url,
		params: init.params ?? {},
		platform,
		cookies: {
			get: (name: string) => {
				const cookie = req.headers.get("cookie") || "";
				const m = cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
				return m ? decodeURIComponent(m[1]) : undefined;
			},
		},
	} as any;

	return event;
}
