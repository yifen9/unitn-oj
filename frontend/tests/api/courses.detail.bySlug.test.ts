import { describe, expect, it, vi } from "vitest";
import { GET } from "../../src/routes/api/v1/schools/[school]/courses/[course]/+server";
import {
	type EventRouteId,
	eventFactoryForEvent,
	expectProblem,
	expectTraceparentEcho,
	jsonOf,
	makeRequest,
} from "./helper";

vi.mock("$lib/api/courses", () => ({
	getCourseBySlugs: vi.fn(async (_db, s: string, c: string) =>
		s === "unitn" && c === "cs101"
			? {
					id: "cid-1",
					school_id: "sid-1",
					slug: "cs101",
					name: "CS101",
					description: null,
					updated_at_s: 1,
				}
			: null,
	),
}));

type Ev = Parameters<typeof GET>[0];
type RId = EventRouteId<Ev>;
const makeEv = eventFactoryForEvent<Ev>(
	"/api/v1/schools/[school]/courses/[course]" as RId,
);

describe("GET /api/v1/schools/{school}/courses/{course}", () => {
	it("200 ok", async () => {
		const req = makeRequest(
			"http://localhost/api/v1/schools/unitn/courses/cs101",
		);
		const ev = makeEv("ok", {
			req,
			params: { school: "unitn", course: "cs101" },
		});
		const res = await GET(ev);
		const body = await jsonOf<{ ok: true; data: { slug: string } }>(res);
		expect(body.data.slug).toBe("cs101");
		expectTraceparentEcho(res, req);
	});
	it("404 not found", async () => {
		const req = makeRequest(
			"http://localhost/api/v1/schools/unitn/courses/unknown",
		);
		const ev = makeEv("ok", {
			req,
			params: { school: "unitn", course: "unknown" },
		});
		const res = await GET(ev);
		await expectProblem(res, 404, { title: "Not found" });
	});
	it("406 not acceptable", async () => {
		const req = makeRequest(
			"http://localhost/api/v1/schools/unitn/courses/cs101",
			{ headers: { accept: "text/plain" } },
		);
		const ev = makeEv("ok", {
			req,
			params: { school: "unitn", course: "cs101" },
		});
		const res = await GET(ev);
		await expectProblem(res, 406, { title: "Not Acceptable" });
	});
	it("500 when query throws", async () => {
		const { getCourseBySlugs } = await import("$lib/api/courses");
		vi.mocked(getCourseBySlugs).mockImplementationOnce(async () => {
			throw new Error("db");
		});
		const req = makeRequest(
			"http://localhost/api/v1/schools/unitn/courses/cs101",
		);
		const ev = makeEv("ok", {
			req,
			params: { school: "unitn", course: "cs101" },
		});
		const res = await GET(ev);
		await expectProblem(res, 500);
	});
});
