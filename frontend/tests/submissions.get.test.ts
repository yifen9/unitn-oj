import { describe, expect, it } from "vitest";
import { signSession, userIdFromEmail } from "../src/lib/api/auth";
import * as mod from "../src/routes/api/v1/submissions/[id]/+server";
import { makeCtx, makeD1Mock, readJson } from "./helpers";

const DEV_ENV = {
	APP_ENV: "development",
	AUTH_SESSION_TTL_SECONDS: "3600",
	AUTH_SESSION_SECRET: "dev-secret",
};
const PROD_ENV = {
	APP_ENV: "prod",
	AUTH_SESSION_TTL_SECONDS: "3600",
	AUTH_SESSION_SECRET: "prod-secret",
};

describe("GET /api/v1/submissions/{id}", () => {
	it("400 when id missing", async () => {
		const { db } = makeD1Mock();
		const ctx = makeCtx({
			url: "http://x/api/v1/submissions/",
			env: { ...DEV_ENV, DB: db },
		});
		const res = await (mod as any).onRequestGet(ctx);
		expect(res.status).toBe(400);
	});

	it("401 when no sid", async () => {
		const { db } = makeD1Mock();
		const ctx = makeCtx({
			url: "http://x/api/v1/submissions/s1",
			env: { ...DEV_ENV, DB: db },
		});
		const res = await (mod as any).onRequestGet(ctx);
		expect(res.status).toBe(401);
	});

	it("404 when not found", async () => {
		const { db } = makeD1Mock();
		const sid = await signSession(
			DEV_ENV.AUTH_SESSION_SECRET,
			"alice@studenti.unitn.it",
		);
		const ctx = makeCtx({
			url: "http://x/api/v1/submissions/s1",
			headers: { cookie: `sid=${sid}` },
			env: { ...DEV_ENV, DB: db },
		});
		const res = await (mod as any).onRequestGet(ctx);
		expect(res.status).toBe(404);
	});

	it("403 when not owner", async () => {
		const { db, state } = makeD1Mock();
		state.firstResult = {
			submissionId: "s1",
			userId: "u_owner",
			problemId: "p1",
			status: "queued",
			createdAt: 1,
		};
		const orig = db.prepare.bind(db);
		(db as any).prepare = (sql: string) => {
			const s = orig(sql);
			if (/FROM\s+submissions\s+WHERE/i.test(sql))
				s.first = async () => state.firstResult;
			return s;
		};
		const sid = await signSession(
			DEV_ENV.AUTH_SESSION_SECRET,
			"alice@studenti.unitn.it",
		);
		const ctx = makeCtx({
			url: "http://x/api/v1/submissions/s1",
			headers: { cookie: `sid=${sid}` },
			env: { ...DEV_ENV, DB: db },
		});
		const res = await (mod as any).onRequestGet(ctx);
		expect(res.status).toBe(403);
	});

	it("200 when owner", async () => {
		const { db, state } = makeD1Mock();
		const email = "alice@studenti.unitn.it";
		const uid = await userIdFromEmail(email);
		state.firstResult = {
			submissionId: "s1",
			userId: uid,
			problemId: "p1",
			status: "queued",
			createdAt: 1,
		};
		const orig = db.prepare.bind(db);
		(db as any).prepare = (sql: string) => {
			const s = orig(sql);
			if (/FROM\s+submissions\s+WHERE/i.test(sql))
				s.first = async () => state.firstResult;
			return s;
		};
		const sid = await signSession(DEV_ENV.AUTH_SESSION_SECRET, email);
		const ctx = makeCtx({
			url: "http://x/api/v1/submissions/s1",
			headers: { cookie: `sid=${sid}` },
			env: { ...DEV_ENV, DB: db },
		});
		const res = await (mod as any).onRequestGet(ctx);
		expect(res.status).toBe(200);
		const j = await readJson(res);
		expect(j.ok).toBe(true);
		expect(j.data.submissionId).toBe("s1");
	});

	it("500 INTERNAL when DB throws in prod", async () => {
		const { db } = makeD1Mock();
		const sid = await signSession(
			PROD_ENV.AUTH_SESSION_SECRET,
			"alice@studenti.unitn.it",
		);
		(db as any).prepare = () => ({
			bind: () => ({
				first: async () => {
					throw new Error("boom");
				},
			}),
		});
		const ctx = makeCtx({
			url: "http://x/api/v1/submissions/s1",
			headers: { cookie: `sid=${sid}` },
			env: { ...PROD_ENV, DB: db },
		});
		const res = await (mod as any).onRequestGet(ctx);
		expect(res.status).toBe(500);
	});
});
