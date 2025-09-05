import { describe, expect, it } from "vitest";
import { GET } from "../../frontend/src/routes/api/v1/courses/[id]/+server";
import { makeD1Mock, makeEvent, readJson } from "./helpers";

const DEV_ENV = { APP_ENV: "development" };

describe("GET /api/v1/courses/{id}", () => {
	it("400 when id missing", async () => {
		const { db } = makeD1Mock();
		const event = makeEvent({
			url: "http://x/api/v1/courses/",
			env: { ...DEV_ENV, DB: db },
			params: {},
		});
		const res = await GET(event as any);
		expect(res.status).toBe(400);
	});

	it("404 when not found", async () => {
		const { db } = makeD1Mock();
		const event = makeEvent({
			url: "http://x/api/v1/courses/NONE",
			env: { ...DEV_ENV, DB: db },
			params: { id: "NONE" },
		});
		const res = await GET(event as any);
		expect(res.status).toBe(404);
	});

	it("200 when found", async () => {
		const { db, state } = makeD1Mock();
		state.firstResult = {
			courseId: "UNITN_CP1",
			schoolId: "ror:unitn",
			name: "CP1",
		};
		const orig = (db as any).prepare.bind(db);
		(db as any).prepare = (sql: string) => {
			const s = orig(sql);
			if (/FROM\s+courses\s+WHERE/i.test(sql)) {
				s.first = async () => state.firstResult;
			}
			return s;
		};

		const event = makeEvent({
			url: "http://x/api/v1/courses/UNITN_CP1",
			env: { ...DEV_ENV, DB: db },
			params: { id: "UNITN_CP1" },
		});
		const res = await GET(event as any);
		expect(res.status).toBe(200);
		const j = await readJson(res);
		expect(j.ok).toBe(true);
		expect(j.data.courseId).toBe("UNITN_CP1");
	});
});
