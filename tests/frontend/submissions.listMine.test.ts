import { describe, expect, it } from "vitest";
import { signSession } from "../../frontend/src/lib/api/auth";
import { GET } from "../../frontend/src/routes/api/v1/users/me/submissions/+server";
import { makeD1Mock, makeEvent, readJson } from "./helpers";

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

describe("GET /api/v1/users/me/submissions", () => {
	it("401 when no sid", async () => {
		const { db } = makeD1Mock();
		const event = makeEvent({
			url: "http://x/api/v1/users/me/submissions",
			env: { ...DEV_ENV, DB: db },
		});
		const res = await GET(event as any);
		expect(res.status).toBe(401);
	});

	it("200 returns list ordered by created_at desc", async () => {
		const { db, state } = makeD1Mock();
		state.allResults = [
			{
				submissionId: "s2",
				userId: "u_x",
				problemId: "p1",
				status: "queued",
				createdAt: 2,
			},
			{
				submissionId: "s1",
				userId: "u_x",
				problemId: "p1",
				status: "queued",
				createdAt: 1,
			},
		];
		const sid = await signSession(
			DEV_ENV.AUTH_SESSION_SECRET,
			"alice@studenti.unitn.it",
		);
		const event = makeEvent({
			url: "http://x/api/v1/users/me/submissions",
			headers: { cookie: `sid=${sid}` },
			env: { ...DEV_ENV, DB: db },
		});
		const res = await GET(event as any);
		expect(res.status).toBe(200);
		const j = await readJson(res);
		expect(j.ok).toBe(true);
		expect(j.data[0].submissionId).toBe("s2");
	});

	it("500 INTERNAL when DB throws in prod", async () => {
		const { db } = makeD1Mock();
		const sid = await signSession(
			PROD_ENV.AUTH_SESSION_SECRET,
			"alice@studenti.unitn.it",
		);
		(db as any).prepare = () => ({
			bind: () => ({
				all: async () => {
					throw new Error("boom");
				},
			}),
		});
		const event = makeEvent({
			url: "http://x/api/v1/users/me/submissions",
			headers: { cookie: `sid=${sid}` },
			env: { ...PROD_ENV, DB: db },
		});
		const res = await GET(event as any);
		expect(res.status).toBe(500);
	});
});
