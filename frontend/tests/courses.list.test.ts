import { describe, expect, it } from "vitest";
import * as mod from "../functions/api/v1/courses/index";
import { makeCtx, makeD1Mock, readJson } from "./helpers";

const DEV_ENV = { APP_ENV: "development" };
const PROD_ENV = { APP_ENV: "prod" };

describe("GET /api/v1/courses", () => {
	it("200 returns list without filter", async () => {
		const { db, state } = makeD1Mock();
		state.allResults = [
			{ courseId: "UNITN_CP1", schoolId: "ror:unitn", name: "CP1" },
		];
		const ctx = makeCtx({
			url: "http://x/api/v1/courses",
			env: { ...DEV_ENV, DB: db },
		});
		const res = await (mod as any).onRequestGet(ctx);
		expect(res.status).toBe(200);
		const j = await readJson(res);
		expect(j.ok).toBe(true);
		expect(j.data[0].courseId).toBe("UNITN_CP1");
	});

	it("400 when schoolId present but empty", async () => {
		const { db } = makeD1Mock();
		const ctx = makeCtx({
			url: "http://x/api/v1/courses?schoolId=",
			env: { ...DEV_ENV, DB: db },
		});
		const res = await (mod as any).onRequestGet(ctx);
		expect(res.status).toBe(400);
	});

	it("200 with schoolId filter and binds param", async () => {
		const { db, state } = makeD1Mock();
		state.allResults = [
			{ courseId: "UNITN_CP1", schoolId: "ror:unitn", name: "CP1" },
		];
		const ctx = makeCtx({
			url: "http://x/api/v1/courses?schoolId=ror:unitn",
			env: { ...DEV_ENV, DB: db },
		});
		const res = await (mod as any).onRequestGet(ctx);
		expect(res.status).toBe(200);
		const j = await readJson(res);
		expect(j.ok).toBe(true);
	});

	it("500 INTERNAL when DB throws in prod", async () => {
		const { db } = makeD1Mock();
		(db as any).prepare = () => ({
			all: async () => {
				throw new Error("boom");
			},
			bind: () => ({
				all: async () => ({ results: [] }),
				first: async () => null,
				run: async () => ({}),
			}),
			first: async () => null,
			run: async () => ({}),
		});
		const ctx = makeCtx({
			url: "http://x/api/v1/courses",
			env: { ...PROD_ENV, DB: db },
		});
		const res = await (mod as any).onRequestGet(ctx);
		expect(res.status).toBe(500);
	});
});
