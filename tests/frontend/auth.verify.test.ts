// tests/auth.verify.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	GET,
	POST,
} from "../../frontend/src/routes/api/v1/auth/verify/+server";
import { makeD1Mock, makeEvent, readJson } from "./helpers";

const DEV = {
	APP_ENV: "dev",
	AUTH_SESSION_TTL_SECONDS: "86400",
	AUTH_SESSION_SECRET: "dev-secret",
};
const PROD = {
	APP_ENV: "prod",
	AUTH_SESSION_TTL_SECONDS: "86400",
	AUTH_SESSION_SECRET: "prod-secret",
};

beforeEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});
afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

describe("/api/v1/auth/verify", () => {
	it("400 in dev GET when token missing", async () => {
		const { db } = makeD1Mock();
		const e = makeEvent({
			url: "http://x/api/v1/auth/verify",
			env: { ...DEV, DB: db },
		});
		const res = await GET(e as any);
		expect(res.status).toBe(400);
		const j = await readJson(res);
		expect(j.ok).toBe(false);
	});

	it("302 in prod GET redirects to continue with token", async () => {
		const { db } = makeD1Mock();
		const e = makeEvent({
			url: "https://oj.example.com/api/v1/auth/verify?token=abc",
			env: { ...PROD, DB: db },
		});
		const res = await GET(e as any);
		expect(res.status).toBe(302);
		const loc = res.headers.get("location") || "";
		expect(loc).toBe("/auth/continue?token=abc");
	});

	it("302 in prod GET redirects to continue without token", async () => {
		const { db } = makeD1Mock();
		const e = makeEvent({
			url: "https://oj.example.com/api/v1/auth/verify",
			env: { ...PROD, DB: db },
		});
		const res = await GET(e as any);
		expect(res.status).toBe(302);
		const loc = res.headers.get("location") || "";
		expect(loc).toBe("/auth/continue");
	});

	it("415 on POST with non-JSON content-type", async () => {
		const { db } = makeD1Mock();
		const e = makeEvent({
			url: "http://local/api/v1/auth/verify",
			method: "POST",
			headers: { "content-type": "text/plain" },
			body: "x",
			env: { ...DEV, DB: db },
		});
		const res = await POST(e as any);
		expect(res.status).toBe(415);
		const j = await readJson(res);
		expect(j.ok).toBe(false);
	});

	it("400 on POST when token missing", async () => {
		const { db } = makeD1Mock();
		const e = makeEvent({
			url: "http://local/api/v1/auth/verify",
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({}),
			env: { ...DEV, DB: db },
		});
		const res = await POST(e as any);
		expect(res.status).toBe(400);
		const j = await readJson(res);
		expect(j.ok).toBe(false);
	});

	it("500 INTERNAL on D1 SELECT error in prod POST", async () => {
		const { db } = makeD1Mock();
		(db as any).prepare = () => ({
			bind: () => ({
				first: async () => {
					throw new Error("D1 select failed");
				},
			}),
		});
		const e = makeEvent({
			url: "https://oj.example.com/api/v1/auth/verify",
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ token: "abc" }),
			env: { ...PROD, DB: db },
		});
		const res = await POST(e as any);
		expect(res.status).toBe(500);
		const j = await readJson(res);
		expect(j.ok).toBe(false);
		expect(j.error.code).toBe("INTERNAL");
	});

	it("401 when token not found", async () => {
		const { db } = makeD1Mock();
		const e = makeEvent({
			url: "http://local/api/v1/auth/verify",
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ token: "missing" }),
			env: { ...DEV, DB: db },
		});
		const res = await POST(e as any);
		expect(res.status).toBe(401);
		const j = await readJson(res);
		expect(j.ok).toBe(false);
	});

	it("401 when token expired", async () => {
		const { db, state } = makeD1Mock();
		state.firstResult = {
			email: "alice@studenti.unitn.it",
			expires_at: Math.floor(Date.now() / 1000) - 1,
		};
		const orig = (db as any).prepare.bind(db);
		(db as any).prepare = (sql: string) => {
			const s = orig(sql);
			if (/SELECT\s+email,\s*expires_at\s+FROM\s+magic_tokens/i.test(sql)) {
				s.first = async <T>() => state.firstResult as T;
			}
			return s;
		};
		const e = makeEvent({
			url: "http://local/api/v1/auth/verify",
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ token: "t" }),
			env: { ...DEV, DB: db },
		});
		const res = await POST(e as any);
		expect(res.status).toBe(401);
		const j = await readJson(res);
		expect(j.ok).toBe(false);
	});

	it("200 POST success in dev sets cookie without Secure", async () => {
		const { db, state } = makeD1Mock();
		state.firstResult = {
			email: "alice@studenti.unitn.it",
			expires_at: Math.floor(Date.now() / 1000) + 60,
		};
		const orig = (db as any).prepare.bind(db);
		(db as any).prepare = (sql: string) => {
			const s = orig(sql);
			if (/SELECT\s+email,\s*expires_at\s+FROM\s+magic_tokens/i.test(sql)) {
				s.first = async <T>() => state.firstResult as T;
			}
			return s;
		};
		const e = makeEvent({
			url: "http://local/api/v1/auth/verify",
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ token: "ok" }),
			env: { ...DEV, DB: db },
		});
		const res = await POST(e as any);
		expect(res.status).toBe(200);
		const j = await readJson(res);
		expect(j.ok).toBe(true);
		const sc = res.headers.get("set-cookie") || "";
		expect(sc).toMatch(/sid=/);
		expect(sc).not.toMatch(/Secure/);
	});

	it("200 POST success in prod sets cookie with Secure", async () => {
		const { db, state } = makeD1Mock();
		state.firstResult = {
			email: "alice@studenti.unitn.it",
			expires_at: Math.floor(Date.now() / 1000) + 60,
		};
		const orig = (db as any).prepare.bind(db);
		(db as any).prepare = (sql: string) => {
			const s = orig(sql);
			if (/SELECT\s+email,\s*expires_at\s+FROM\s+magic_tokens/i.test(sql)) {
				s.first = async <T>() => state.firstResult as T;
			}
			return s;
		};
		const e = makeEvent({
			url: "https://oj.example.com/api/v1/auth/verify",
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ token: "ok" }),
			env: { ...PROD, DB: db },
		});
		const res = await POST(e as any);
		expect(res.status).toBe(200);
		const j = await readJson(res);
		expect(j.ok).toBe(true);
		const sc = res.headers.get("set-cookie") || "";
		expect(sc).toMatch(/sid=/);
		expect(sc).toMatch(/Secure/);
	});
});
