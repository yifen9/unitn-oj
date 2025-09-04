import { describe, expect, it } from "vitest";
import * as mod from "../src/routes/api/v1/schools/[id]";
import { makeCtx, makeD1Mock, readJson } from "./helpers";

const DEV_ENV = { APP_ENV: "development" };

describe("GET /api/v1/schools/{id}", () => {
	it("400 when id missing", async () => {
		const { db } = makeD1Mock();
		const ctx = makeCtx({
			url: "http://x/api/v1/schools/",
			env: { ...DEV_ENV, DB: db },
		});
		const res = await (mod as any).onRequestGet(ctx);
		expect(res.status).toBe(400);
	});

	it("404 when not found", async () => {
		const { db } = makeD1Mock();
		const ctx = makeCtx({
			url: "http://x/api/v1/schools/none",
			env: { ...DEV_ENV, DB: db },
		});
		const res = await (mod as any).onRequestGet(ctx);
		expect(res.status).toBe(404);
	});

	it("200 when found", async () => {
		const { db, state } = makeD1Mock();
		state.firstResult = { schoolId: "ror:unitn", name: "UNITN" };
		const orig = db.prepare.bind(db);
		(db as any).prepare = (sql: string) => {
			const s = orig(sql);
			if (/FROM\s+schools\s+WHERE/i.test(sql))
				s.first = async () => state.firstResult;
			return s;
		};
		const ctx = makeCtx({
			url: "http://x/api/v1/schools/ror:unitn",
			env: { ...DEV_ENV, DB: db },
		});
		const res = await (mod as any).onRequestGet(ctx);
		expect(res.status).toBe(200);
		const j = await readJson(res);
		expect(j.ok).toBe(true);
		expect(j.data.schoolId).toBe("ror:unitn");
	});
});
