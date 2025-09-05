import { describe, expect, it } from "vitest";
import { GET } from "../../frontend/src/routes/api/v1/schools/+server";
import { makeD1Mock, makeEvent, readJson } from "./helpers";

const DEV_ENV = { APP_ENV: "development" };
const PROD_ENV = { APP_ENV: "prod" };

describe("GET /api/v1/schools", () => {
	it("200 returns list", async () => {
		const { db, state } = makeD1Mock();
		state.allResults = [{ schoolId: "ror:unitn", name: "UNITN" }];
		const event = makeEvent({
			url: "http://x/api/v1/schools",
			env: { ...DEV_ENV, DB: db },
		});
		const res = await GET(event as any);
		expect(res.status).toBe(200);
		const j = await readJson(res);
		expect(j.ok).toBe(true);
		expect(Array.isArray(j.data)).toBe(true);
		expect(j.data[0].schoolId).toBe("ror:unitn");
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
		const event = makeEvent({
			url: "http://x/api/v1/schools",
			env: { ...PROD_ENV, DB: db },
		});
		const res = await GET(event as any);
		expect(res.status).toBe(500);
	});
});
