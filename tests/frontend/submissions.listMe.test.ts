import { describe, expect, it } from "vitest";
import { signSession } from "../../frontend/src/lib/api/auth";
import { GET } from "../../frontend/src/routes/api/v1/users/me/submissions/+server";
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

describe("GET /api/v1/users/me/submissions", () => {
	it("401 when no sid", async () => {
		const { db } = makeD1Mock();
		const e = makeEvent({
			url: "http://x/api/v1/users/me/submissions",
			env: { ...DEV, DB: db },
		});
		const res = await GET(e as any);
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
			DEV.AUTH_SESSION_SECRET,
			"alice@studenti.unitn.it",
		);
		const e = makeEvent({
			url: "http://x/api/v1/users/me/submissions",
			headers: { cookie: `sid=${sid}` },
			env: { ...DEV, DB: db },
		});
		const res = await GET(e as any);
		expect(res.status).toBe(200);
		const j = await readJson(res);
		expect(j.ok).toBe(true);
		expect(j.data.map((x: any) => x.submissionId)).toEqual(["s2", "s1"]);
	});

	it("500 when DB throws in prod", async () => {
		const { db } = makeD1Mock();
		const sid = await signSession(
			PROD.AUTH_SESSION_SECRET,
			"alice@studenti.unitn.it",
		);
		(db as any).prepare = () => ({
			bind: () => ({
				all: async () => {
					throw new Error("boom");
				},
			}),
		});
		const e = makeEvent({
			url: "http://x/api/v1/users/me/submissions",
			headers: { cookie: `sid=${sid}` },
			env: { ...PROD, DB: db },
		});
		const res = await GET(e as any);
		expect(res.status).toBe(500);
	});
});
