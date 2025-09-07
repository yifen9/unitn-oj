import { describe, expect, it } from "vitest";
import { signSession } from "../../frontend/src/lib/api/auth";
import { POST } from "../../frontend/src/routes/api/v1/problems/[id]/submissions/+server";
import { makeD1Mock, makeEvent, readJson } from "./helpers";

const DEV = {
	APP_ENV: "development",
	AUTH_SESSION_TTL_SECONDS: "3600",
	AUTH_SESSION_SECRET: "dev-secret",
};
const PROD = {
	APP_ENV: "prod",
	AUTH_SESSION_TTL_SECONDS: "3600",
	AUTH_SESSION_SECRET: "prod-secret",
};

describe("POST /api/v1/problems/{id}/submissions", () => {
	it("400 when problemId missing", async () => {
		const { db } = makeD1Mock();
		const e = makeEvent({
			url: "http://x/api/v1/problems//submissions",
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ code: "x" }),
			env: { ...DEV, DB: db },
			params: {},
		});
		const res = await POST(e as any);
		expect(res.status).toBe(400);
	});

	it("401 when no sid", async () => {
		const { db } = makeD1Mock();
		const e = makeEvent({
			url: "http://x/api/v1/problems/p1/submissions",
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ code: "x" }),
			env: { ...DEV, DB: db },
			params: { id: "p1" },
		});
		const res = await POST(e as any);
		expect(res.status).toBe(401);
	});

	it("415 when content-type not json", async () => {
		const { db } = makeD1Mock();
		const sid = await signSession(
			DEV.AUTH_SESSION_SECRET,
			"alice@studenti.unitn.it",
		);
		const e = makeEvent({
			url: "http://x/api/v1/problems/p1/submissions",
			method: "POST",
			headers: { cookie: `sid=${sid}`, "content-type": "text/plain" },
			body: "code=abc",
			env: { ...DEV, DB: db },
			params: { id: "p1" },
		});
		const res = await POST(e as any);
		expect(res.status).toBe(415);
	});

	it("400 when code missing or empty", async () => {
		const { db } = makeD1Mock();
		const sid = await signSession(
			DEV.AUTH_SESSION_SECRET,
			"alice@studenti.unitn.it",
		);
		const e = makeEvent({
			url: "http://x/api/v1/problems/p1/submissions",
			method: "POST",
			headers: { cookie: `sid=${sid}`, "content-type": "application/json" },
			body: JSON.stringify({}),
			env: { ...DEV, DB: db },
			params: { id: "p1" },
		});
		const res = await POST(e as any);
		expect(res.status).toBe(400);
	});

	it("201 creates submission and returns observable effects in dev", async () => {
		const { db, state } = makeD1Mock();
		const sid = await signSession(
			DEV.AUTH_SESSION_SECRET,
			"alice@studenti.unitn.it",
		);

		let insertArgs: any[] | null = null;
		const origPrepare = (db as any).prepare.bind(db);
		(db as any).prepare = (sql: string) => {
			const stmt = origPrepare(sql);
			if (/^\s*INSERT\s+INTO\s+submissions/i.test(sql)) {
				const origBind = stmt.bind.bind(stmt);
				stmt.bind = (...args: any[]) => {
					insertArgs = [...args];
					return origBind(...args);
				};
			}
			return stmt;
		};

		const calls: any[] = [];
		const e = makeEvent({
			url: "http://x/api/v1/problems/p1/submissions",
			method: "POST",
			headers: { cookie: `sid=${sid}`, "content-type": "application/json" },
			body: JSON.stringify({ code: "print(1)" }),
			env: { ...DEV, DB: db, QUEUE: { send: async (m: any) => calls.push(m) } },
			params: { id: "p1" },
		});

		const res = await POST(e as any);
		expect(res.status).toBe(201);

		const j = await readJson(res);
		const sidFromRes = j?.data?.submissionId;
		const pidFromRes = j?.data?.problemId;
		const sidFromQueue = calls[0]?.submissionId;
		const pidFromQueue = calls[0]?.problemId;
		const sidFromInsert = insertArgs?.[0];
		const pidFromInsert = insertArgs?.[2];

		const finalSid = sidFromRes ?? sidFromQueue ?? sidFromInsert;
		const finalPid = pidFromRes ?? pidFromQueue ?? pidFromInsert;

		expect(typeof finalSid).toBe("string");
		expect(finalPid).toBe("p1");
		expect(Array.isArray(state.prepared)).toBe(true);
		expect(
			state.prepared.some((s) => /INSERT\s+INTO\s+submissions/i.test(s)),
		).toBe(true);
		expect(calls.length).toBe(1);
	});

	it("500 when DB insert fails in prod", async () => {
		const { db } = makeD1Mock();
		(db as any).prepare = () => ({
			bind: () => ({
				run: async () => {
					throw new Error("boom");
				},
			}),
		});
		const sid = await signSession(
			PROD.AUTH_SESSION_SECRET,
			"alice@studenti.unitn.it",
		);
		const e = makeEvent({
			url: "http://x/api/v1/problems/p1/submissions",
			method: "POST",
			headers: { cookie: `sid=${sid}`, "content-type": "application/json" },
			body: JSON.stringify({ code: "x" }),
			env: { ...PROD, DB: db, QUEUE: { send: async () => {} } },
			params: { id: "p1" },
		});
		const res = await POST(e as any);
		expect(res.status).toBe(500);
	});

	it("500 when queue send fails in prod", async () => {
		const { db } = makeD1Mock();
		const sid = await signSession(
			PROD.AUTH_SESSION_SECRET,
			"alice@studenti.unitn.it",
		);
		const e = makeEvent({
			url: "http://x/api/v1/problems/p1/submissions",
			method: "POST",
			headers: { cookie: `sid=${sid}`, "content-type": "application/json" },
			body: JSON.stringify({ code: "x" }),
			env: {
				...PROD,
				DB: db,
				QUEUE: {
					send: async () => {
						throw new Error("qfail");
					},
				},
			},
			params: { id: "p1" },
		});
		const res = await POST(e as any);
		expect(res.status).toBe(500);
	});
});
