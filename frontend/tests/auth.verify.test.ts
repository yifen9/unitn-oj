import { describe, expect, it } from "vitest";
import * as mod from "../src/routes/api/v1/auth/verify/+server";
import { makeCtx, makeD1Mock, readJson } from "./helpers";

const DEV_ENV = {
	APP_ENV: "dev",
	AUTH_SESSION_TTL_SECONDS: "86400",
	AUTH_SESSION_SECRET: "dev-secret",
};

const PROD_ENV = {
	APP_ENV: "prod",
	AUTH_SESSION_TTL_SECONDS: "86400",
	AUTH_SESSION_SECRET: "prod-secret",
};

describe("/api/v1/auth/verify", () => {
	it("400 when token missing (GET without token)", async () => {
		const ctx = makeCtx({ url: "http://x/api/v1/auth/verify", env: DEV_ENV });
		const res = await (mod as any).onRequest(ctx);
		expect(res.status).toBe(400);
		const j = await readJson(res);
		expect(j.ok).toBe(false);
		expect(j.error.code).toBe("INVALID_ARGUMENT");
	});

	it("415 when POST without JSON content-type", async () => {
		const ctx = makeCtx({
			url: "http://x/api/v1/auth/verify",
			method: "POST",
			headers: { "content-type": "text/plain" },
			body: "token=abc",
			env: DEV_ENV,
		});
		const res = await (mod as any).onRequest(ctx);
		expect(res.status).toBe(415);
		const j = await readJson(res);
		expect(j.ok).toBe(false);
		expect(j.error.code).toBe("INVALID_ARGUMENT");
	});

	it("400 when POST invalid JSON body", async () => {
		const ctx = makeCtx({
			url: "http://x/api/v1/auth/verify",
			method: "POST",
			headers: { "content-type": "application/json" },
			body: "{invalid",
			env: DEV_ENV,
		});
		const res = await (mod as any).onRequest(ctx);
		expect(res.status).toBe(400);
		const j = await readJson(res);
		expect(j.ok).toBe(false);
		expect(j.error.code).toBe("INVALID_ARGUMENT");
	});

	it("401 UNAUTHENTICATED when token not found", async () => {
		const { db, state } = makeD1Mock();
		const ctx = makeCtx({
			url: "http://local/api/v1/auth/verify?token=notfound",
			env: { ...DEV_ENV, DB: db },
		});
		const res = await (mod as any).onRequest(ctx);
		expect(res.status).toBe(401);
		const j = await readJson(res);
		expect(j.ok).toBe(false);
		expect(j.error.code).toBe("UNAUTHENTICATED");
		expect(state.prepared[0]).toMatch(
			/SELECT\s+email,\s*expires_at\s+FROM\s+magic_tokens/i,
		);
	});

	it("401 UNAUTHENTICATED when token expired and it is deleted", async () => {
		const { db, state } = makeD1Mock();
		state.firstResult = {
			email: "alice@studenti.unitn.it",
			expires_at: Math.floor(Date.now() / 1000) - 1,
		};

		const origPrepare = db.prepare.bind(db);
		(db as any).prepare = (sql: string) => {
			const stmt = origPrepare(sql);
			if (/SELECT\s+email,\s*expires_at\s+FROM\s+magic_tokens/i.test(sql)) {
				stmt.first = async <T>() => state.firstResult as T;
			}
			return stmt;
		};

		const ctx = makeCtx({
			url: "http://local/api/v1/auth/verify?token=expired",
			env: { ...DEV_ENV, DB: db },
		});

		const res = await (mod as any).onRequest(ctx);
		expect(res.status).toBe(401);
		const j = await readJson(res);
		expect(j.ok).toBe(false);
		expect(j.error.code).toBe("UNAUTHENTICATED");

		expect(state.lastSQL).toMatch(/DELETE\s+FROM\s+magic_tokens/i);
	});

	it("500 INTERNAL on D1 SELECT error in prod", async () => {
		const { db } = makeD1Mock();
		const origPrepare = db.prepare.bind(db);
		(db as any).prepare = (sql: string) => {
			const stmt = origPrepare(sql);
			if (/SELECT\s+email,\s*expires_at\s+FROM\s+magic_tokens/i.test(sql)) {
				stmt.first = async () => {
					throw new Error("D1 select failed");
				};
			}
			return stmt;
		};

		const ctx = makeCtx({
			url: "https://oj.example.com/api/v1/auth/verify?token=abc",
			env: { ...PROD_ENV, DB: db },
		});
		const res = await (mod as any).onRequest(ctx);
		expect(res.status).toBe(500);
		const j = await readJson(res);
		expect(j.ok).toBe(false);
		expect(j.error.code).toBe("INTERNAL");
	});

	it("200 GET path: valid token → sets cookie and upserts user", async () => {
		const { db, state } = makeD1Mock();
		state.firstResult = {
			email: "alice@studenti.unitn.it",
			expires_at: Math.floor(Date.now() / 1000) + 60,
		};

		const origPrepare = db.prepare.bind(db);
		(db as any).prepare = (sql: string) => {
			const stmt = origPrepare(sql);
			if (/SELECT\s+email,\s*expires_at\s+FROM\s+magic_tokens/i.test(sql)) {
				stmt.first = async <T>() => state.firstResult as T;
			}
			return stmt;
		};

		const ctx = makeCtx({
			url: "http://local/api/v1/auth/verify?token=ok",
			env: { ...DEV_ENV, DB: db },
		});

		const res = await (mod as any).onRequest(ctx);
		expect(res.status).toBe(200);

		const j = await readJson(res);
		expect(j.ok).toBe(true);
		expect(j.data.email).toBe("alice@studenti.unitn.it");
		expect(j.data.userId).toMatch(/^u_[0-9a-f]{16}$/);

		const setCookie = res.headers.get("set-cookie") || "";
		expect(setCookie).toMatch(/sid=/);
		expect(setCookie).toMatch(/HttpOnly/);
		expect(setCookie).toMatch(/SameSite=Lax/);
		expect(setCookie).toMatch(/Max-Age=\d+/);
	});

	it("200 POST path with JSON token body also works", async () => {
		const { db, state } = makeD1Mock();
		state.firstResult = {
			email: "alice@studenti.unitn.it",
			expires_at: Math.floor(Date.now() / 1000) + 60,
		};

		const origPrepare = db.prepare.bind(db);
		(db as any).prepare = (sql: string) => {
			const stmt = origPrepare(sql);
			if (/SELECT\s+email,\s*expires_at\s+FROM\s+magic_tokens/i.test(sql)) {
				stmt.first = async <T>() => state.firstResult as T;
			}
			return stmt;
		};

		const ctx = makeCtx({
			url: "http://local/api/v1/auth/verify",
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ token: "ok" }),
			env: { ...DEV_ENV, DB: db },
		});

		const res = await (mod as any).onRequest(ctx);
		expect(res.status).toBe(200);
		const j = await readJson(res);
		expect(j.ok).toBe(true);
		expect(j.data.email).toBe("alice@studenti.unitn.it");

		const setCookie = res.headers.get("set-cookie") || "";
		expect(setCookie).toMatch(/sid=/);
	});

	it("500 INTERNAL on D1 upsert/delete error in prod", async () => {
		const { db, state } = makeD1Mock();
		state.firstResult = {
			email: "alice@studenti.unitn.it",
			expires_at: Math.floor(Date.now() / 1000) + 60,
		};

		const origPrepare = db.prepare.bind(db);
		(db as any).prepare = (sql: string) => {
			const stmt = origPrepare(sql);
			if (/SELECT\s+email,\s*expires_at\s+FROM\s+magic_tokens/i.test(sql)) {
				stmt.first = async <T>() => state.firstResult as T;
			}
			return stmt;
		};
		(db as any).batch = async () => {
			throw new Error("D1 batch failed");
		};

		const ctx = makeCtx({
			url: "https://oj.example.com/api/v1/auth/verify?token=ok",
			env: { ...PROD_ENV, DB: db },
		});

		const res = await (mod as any).onRequest(ctx);
		expect(res.status).toBe(500);
		const j = await readJson(res);
		expect(j.ok).toBe(false);
		expect(j.error.code).toBe("INTERNAL");
	});

	it("accepts application/merge-patch+json for POST token", async () => {
		const { db, state } = makeD1Mock();
		state.firstResult = {
			email: "alice@studenti.unitn.it",
			expires_at: Math.floor(Date.now() / 1000) + 60,
		};

		const origPrepare = db.prepare.bind(db);
		(db as any).prepare = (sql: string) => {
			const stmt = origPrepare(sql);
			if (/SELECT\s+email,\s*expires_at\s+FROM\s+magic_tokens/i.test(sql)) {
				stmt.first = async <T>() => state.firstResult as T;
			}
			return stmt;
		};

		const ctx = makeCtx({
			url: "http://local/api/v1/auth/verify",
			method: "POST",
			headers: { "content-type": "application/merge-patch+json" },
			body: JSON.stringify({ token: "ok" }),
			env: { ...DEV_ENV, DB: db },
		});

		const res = await (mod as any).onRequest(ctx);
		expect(res.status).toBe(200);
	});
});
