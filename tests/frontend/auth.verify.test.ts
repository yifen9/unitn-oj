import { describe, expect, it } from "vitest";
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

describe("/api/v1/auth/verify", () => {
	it("400 when token missing (GET without token)", async () => {
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

	it("500 INTERNAL on D1 SELECT error in prod", async () => {
		const { db } = makeD1Mock();

		(db as any).prepare = () => ({
			bind: () => ({
				first: async () => {
					throw new Error("D1 select failed");
				},
			}),
		});

		const e = makeEvent({
			url: "https://oj.example.com/api/v1/auth/verify?token=abc",
			env: {
				APP_ENV: "prod",
				AUTH_SESSION_TTL_SECONDS: "86400",
				AUTH_SESSION_SECRET: "prod-secret",
				DB: db,
			},
		});

		const res = await GET(e as any);
		expect(res.status).toBe(500);
		const j = await res.json();
		expect(j.ok).toBe(false);
		expect(j.error.code).toBe("INTERNAL");
	});

	it("200 GET path: valid token → sets cookie and upserts user", async () => {
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
			url: "http://local/api/v1/auth/verify?token=ok",
			env: { ...DEV, DB: db },
		});
		const res = await GET(e as any);
		expect(res.status).toBe(200);
		const j = await readJson(res);
		expect(j.ok).toBe(true);
		expect(j.data.email).toBe("alice@studenti.unitn.it");
		const sc = res.headers.get("set-cookie") || "";
		expect(sc).toMatch(/sid=/);
	});

	it("200 POST path with JSON token also works", async () => {
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
	});
});
