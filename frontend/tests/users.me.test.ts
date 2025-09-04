import { describe, expect, it } from "vitest";
import { signSession } from "../functions/_lib/auth";
import * as mod from "../functions/api/v1/users/me";
import { makeCtx, makeD1Mock, readJson } from "./helpers";

const DEV_ENV = {
	APP_ENV: "dev",
	AUTH_SESSION_TTL_SECONDS: "3600",
	AUTH_SESSION_SECRET: "dev-secret",
};

describe("GET /api/v1/users/me", () => {
	it("401 when sid cookie missing", async () => {
		const { db } = makeD1Mock();
		const ctx = makeCtx({
			url: "http://x/api/v1/users/me",
			env: { ...DEV_ENV, DB: db },
		});
		const res = await (mod as any).onRequestGet(ctx);
		expect(res.status).toBe(401);
		const j = await readJson(res);
		expect(j.ok).toBe(false);
		expect(j.error.code).toBe("UNAUTHENTICATED");
	});

	it("401 when sid invalid", async () => {
		const { db } = makeD1Mock();
		const ctx = makeCtx({
			url: "http://x/api/v1/users/me",
			headers: { cookie: "sid=bad.sid.token" },
			env: { ...DEV_ENV, DB: db },
		});
		const res = await (mod as any).onRequestGet(ctx);
		expect(res.status).toBe(401);
	});

	it("200 when session valid and user exists", async () => {
		const { db, state } = makeD1Mock();
		const email = "alice@studenti.unitn.it";
		const sid = await signSession(DEV_ENV.AUTH_SESSION_SECRET, email);
		state.firstResult = {
			userId: "u_12345678",
			email,
			nickname: "alice",
			createdAt: 1234567890,
		};

		const origPrepare = db.prepare.bind(db);
		(db as any).prepare = (sql: string) => {
			const stmt = origPrepare(sql);
			if (/SELECT user_id/i.test(sql)) {
				stmt.first = async <_T>() => state.firstResult as any;
			}
			return stmt;
		};

		const ctx = makeCtx({
			url: "http://x/api/v1/users/me",
			headers: { cookie: `sid=${sid}` },
			env: { ...DEV_ENV, DB: db },
		});

		const res = await (mod as any).onRequestGet(ctx);
		expect(res.status).toBe(200);
		const j = await readJson(res);
		expect(j.ok).toBe(true);
		expect(j.data.email).toBe(email);
		expect(j.data.userId).toMatch(/^u_/);
		expect(typeof j.data.createdAt).toBe("number");
	});

	it("401 when user not found", async () => {
		const { db } = makeD1Mock();
		const email = "ghost@studenti.unitn.it";
		const sid = await signSession(DEV_ENV.AUTH_SESSION_SECRET, email);

		const ctx = makeCtx({
			url: "http://x/api/v1/users/me",
			headers: { cookie: `sid=${sid}` },
			env: { ...DEV_ENV, DB: db },
		});

		const res = await (mod as any).onRequestGet(ctx);
		expect(res.status).toBe(401);
	});

	it("500 INTERNAL when DB throws in prod", async () => {
		const { db } = makeD1Mock();
		const email = "alice@studenti.unitn.it";
		const PROD_ENV = {
			APP_ENV: "prod",
			AUTH_SESSION_TTL_SECONDS: "3600",
			AUTH_SESSION_SECRET: "prod-secret",
		};
		const sid = await signSession(PROD_ENV.AUTH_SESSION_SECRET, email);
		(db as any).prepare = () => {
			return {
				bind: () => ({
					first: async () => {
						throw new Error("boom");
					},
					run: async () => {},
				}),
			};
		};

		const ctx = makeCtx({
			url: "http://x/api/v1/users/me",
			headers: { cookie: `sid=${sid}` },
			env: { ...PROD_ENV, DB: db },
		});

		const res = await (mod as any).onRequestGet(ctx);
		expect(res.status).toBe(500);
	});
});
