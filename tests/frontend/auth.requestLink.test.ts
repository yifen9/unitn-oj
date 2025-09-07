// tests/auth.requestLink.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "../../frontend/src/routes/api/v1/auth/requestLink/+server";
import { makeD1Mock, makeEvent, readJson } from "./helpers";

const DEV = {
	APP_ENV: "dev",
	AUTH_ALLOWED_DOMAIN: "studenti.unitn.it",
	AUTH_TOKEN_TTL_SECONDS: "300",
	AUTH_SESSION_SECRET: "dev-secret",
};
const PROD = {
	APP_ENV: "prod",
	AUTH_ALLOWED_DOMAIN: "studenti.unitn.it",
	AUTH_TOKEN_TTL_SECONDS: "300",
	AUTH_SESSION_SECRET: "prod-secret",
	TURNSTILE_SECRET: "ts-secret",
	RESEND_API_KEY: "rk",
};

beforeEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});
afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

describe("POST /api/v1/auth/requestLink", () => {
	it("415 when content-type is not JSON", async () => {
		const { db } = makeD1Mock();
		const e = makeEvent({
			url: "http://local/api/v1/auth/requestLink",
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

	it("400 when email not in allowed domain", async () => {
		const { db } = makeD1Mock();
		const e = makeEvent({
			url: "http://local/api/v1/auth/requestLink",
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ email: "alice@foo.bar" }),
			env: { ...DEV, DB: db },
		});
		const res = await POST(e as any);
		expect(res.status).toBe(400);
		const j = await readJson(res);
		expect(j.ok).toBe(false);
	});

	it("403 in prod when turnstile token missing", async () => {
		const { db } = makeD1Mock();
		const e = makeEvent({
			url: "https://oj.example.com/api/v1/auth/requestLink",
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ email: "alice@studenti.unitn.it" }),
			env: { ...PROD, DB: db },
		});
		const res = await POST(e as any);
		expect(res.status).toBe(403);
		const j = await readJson(res);
		expect(j.ok).toBe(false);
	});

	it("403 in prod when turnstile verification fails", async () => {
		vi.stubGlobal("fetch", async (url: any) => {
			if (String(url).includes("turnstile")) {
				return new Response(JSON.stringify({ success: false }), {
					status: 200,
					headers: { "content-type": "application/json" },
				});
			}
			return new Response("{}", { status: 500 });
		});
		const { db } = makeD1Mock();
		const e = makeEvent({
			url: "https://oj.example.com/api/v1/auth/requestLink",
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				email: "alice@studenti.unitn.it",
				turnstileToken: "bad",
			}),
			env: { ...PROD, DB: db },
		});
		const res = await POST(e as any);
		expect(res.status).toBe(403);
		const j = await readJson(res);
		expect(j.ok).toBe(false);
	});

	it("500 INTERNAL on D1 insert error in prod", async () => {
		vi.stubGlobal("fetch", async (url: any) => {
			if (String(url).includes("turnstile")) {
				return new Response(JSON.stringify({ success: true }), {
					status: 200,
					headers: { "content-type": "application/json" },
				});
			}
			return new Response("{}", { status: 200 });
		});
		const { db } = makeD1Mock();
		(db as any).prepare = () => ({
			bind: () => ({
				run: async () => {
					throw new Error("D1 insert failed");
				},
			}),
		});
		const e = makeEvent({
			url: "https://oj.example.com/api/v1/auth/requestLink",
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				email: "alice@studenti.unitn.it",
				turnstileToken: "ok",
			}),
			env: { ...PROD, DB: db },
		});
		const res = await POST(e as any);
		expect(res.status).toBe(500);
		const j = await readJson(res);
		expect(j.ok).toBe(false);
		expect(j.error.code).toBe("INTERNAL");
	});

	it("500 INTERNAL when resend API fails in prod", async () => {
		vi.stubGlobal("fetch", async (url: any) => {
			if (String(url).includes("turnstile")) {
				return new Response(JSON.stringify({ success: true }), {
					status: 200,
					headers: { "content-type": "application/json" },
				});
			}
			if (String(url).includes("api.resend.com")) {
				return new Response(JSON.stringify({}), {
					status: 500,
					headers: { "content-type": "application/json" },
				});
			}
			return new Response("{}", { status: 200 });
		});
		const { db } = makeD1Mock();
		const e = makeEvent({
			url: "https://oj.example.com/api/v1/auth/requestLink",
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				email: "alice@studenti.unitn.it",
				turnstileToken: "ok",
			}),
			env: { ...PROD, DB: db },
		});
		const res = await POST(e as any);
		expect(res.status).toBe(500);
		const j = await readJson(res);
		expect(j.ok).toBe(false);
		expect(j.error.code).toBe("INTERNAL");
	});

	it("200 in prod when siteverify and resend succeed", async () => {
		const calls: string[] = [];
		vi.stubGlobal("fetch", async (url: any, init?: any) => {
			calls.push(String(url));
			if (String(url).includes("turnstile")) {
				return new Response(JSON.stringify({ success: true }), {
					status: 200,
					headers: { "content-type": "application/json" },
				});
			}
			if (String(url).includes("api.resend.com")) {
				return new Response(JSON.stringify({ id: "m_1" }), {
					status: 200,
					headers: { "content-type": "application/json" },
				});
			}
			return new Response("{}", { status: 200 });
		});
		const { db } = makeD1Mock();
		const e = makeEvent({
			url: "https://oj.example.com/api/v1/auth/requestLink",
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				email: "alice@studenti.unitn.it",
				turnstileToken: "ok",
			}),
			env: { ...PROD, DB: db },
		});
		const res = await POST(e as any);
		expect(res.status).toBe(200);
		const j = await readJson(res);
		expect(j.ok).toBe(true);
		expect(j?.data?.magicUrl).toBeUndefined();
		expect(calls.some((u) => u.includes("turnstile"))).toBe(true);
		expect(calls.some((u) => u.includes("api.resend.com"))).toBe(true);
	});

	it("200 in dev returns magicUrl", async () => {
		const { db } = makeD1Mock();
		const e = makeEvent({
			url: "http://local/api/v1/auth/requestLink",
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ email: "alice@studenti.unitn.it" }),
			env: { ...DEV, DB: db },
		});
		const res = await POST(e as any);
		expect(res.status).toBe(200);
		const j = await readJson(res);
		expect(j.ok).toBe(true);
		expect(j.data.magicUrl).toMatch(/^http:\/\/local\/auth\/continue\?token=/);
	});
});
