import { describe, expect, it } from "vitest";
import { GET } from "../src/routes/api/v1/courses/[courseId]/problems/index/+server";
import { makeD1Mock, makeEvent, readJson } from "./helpers";

const DEV_ENV = { APP_ENV: "development" };
const PROD_ENV = { APP_ENV: "prod" };

describe("GET /api/v1/courses/{courseId}/problems", () => {
	it("400 when courseId missing", async () => {
		const { db } = makeD1Mock();
		const event = makeEvent({
			url: "http://x/api/v1/courses//problems",
			env: { ...DEV_ENV, DB: db },
			params: {}, // 缺少 courseId
		});
		const res = await GET(event as any);
		expect(res.status).toBe(400);
	});

	it("200 returns empty list when no mapping", async () => {
		const { db, state } = makeD1Mock();
		state.allResults = [];
		const event = makeEvent({
			url: "http://x/api/v1/courses/UNITN_CP1/problems",
			env: { ...DEV_ENV, DB: db },
			params: { courseId: "UNITN_CP1" },
		});
		const res = await GET(event as any);
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
		const event = makeEvent({
			url: "http://x/api/v1/courses/UNITN_CP1/problems",
			env: { ...DEV_ENV, DB: db },
			params: { courseId: "UNITN_CP1" },
		});
		const res = await GET(event as any);
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
		const event = makeEvent({
			url: "http://x/api/v1/courses/UNITN_CP1/problems",
			env: { ...PROD_ENV, DB: db },
			params: { courseId: "UNITN_CP1" },
		});
		const res = await GET(event as any);
		expect(res.status).toBe(500);
	});
});
