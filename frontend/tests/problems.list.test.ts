import { describe, expect, it } from "vitest";
import * as mod from "../src/routes/api/v1/courses/[courseId]/problems/index/+server";
import { makeCtx, makeD1Mock, readJson } from "./helpers";

const DEV_ENV = { APP_ENV: "development" };
const PROD_ENV = { APP_ENV: "prod" };

describe("GET /api/v1/courses/{courseId}/problems", () => {
	it("400 when courseId missing", async () => {
		const { db } = makeD1Mock();
		const ctx = makeCtx({
			url: "http://x/api/v1/courses//problems",
			env: { ...DEV_ENV, DB: db },
		});
		const res = await (mod as any).onRequestGet(ctx);
		expect(res.status).toBe(400);
	});

	it("200 returns empty list when no mapping", async () => {
		const { db, state } = makeD1Mock();
		state.allResults = [];
		const ctx = makeCtx({
			url: "http://x/api/v1/courses/UNITN_CP1/problems",
			env: { ...DEV_ENV, DB: db },
		});
		const res = await (mod as any).onRequestGet(ctx);
		expect(res.status).toBe(200);
		const j = await readJson(res);
		expect(j.ok).toBe(true);
		expect(Array.isArray(j.data)).toBe(true);
		expect(j.data.length).toBe(0);
	});

	it("200 returns list ordered by ordinal then title", async () => {
		const { db, state } = makeD1Mock();
		state.allResults = [
			{ problemId: "p_b", title: "B" },
			{ problemId: "p_c", title: "C" },
		];
		const ctx = makeCtx({
			url: "http://x/api/v1/courses/UNITN_CP1/problems",
			env: { ...DEV_ENV, DB: db },
		});
		const res = await (mod as any).onRequestGet(ctx);
		expect(res.status).toBe(200);
		const j = await readJson(res);
		expect(j.ok).toBe(true);
		expect(j.data[0].problemId).toBe("p_b");
	});

	it("500 INTERNAL when DB throws in prod", async () => {
		const { db } = makeD1Mock();
		(db as any).prepare = () => ({
			bind: () => ({
				all: async () => {
					throw new Error("boom");
				},
			}),
		});
		const ctx = makeCtx({
			url: "http://x/api/v1/courses/UNITN_CP1/problems",
			env: { ...PROD_ENV, DB: db },
		});
		const res = await (mod as any).onRequestGet(ctx);
		expect(res.status).toBe(500);
	});
});
