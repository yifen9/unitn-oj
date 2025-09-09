import { describe, expect, it, vi } from "vitest";
import { GET } from "../../src/routes/api/v1/schools/[school]/courses/[course]/problems/+server";
import {
	type EventRouteId,
	eventFactoryForEvent,
	expectProblem,
	expectTraceparentEcho,
	jsonOf,
	makeRequest,
} from "./helper";

vi.mock("$lib/api/problems", () => ({
	listProblemsByCourseSlugs: vi.fn(async () => [
		{ id: "p1", slug: "a", name: "A", updated_at_s: 1 },
		{ id: "p2", slug: "b", name: "B", updated_at_s: 2 },
	]),
}));

type Ev = Parameters<typeof GET>[0];
type RId = EventRouteId<Ev>;
const makeEv = eventFactoryForEvent<Ev>(
	"/api/v1/schools/[school]/courses/[course]/problems" as RId,
);

describe("GET /api/v1/schools/{school}/courses/{course}/problems", () => {
	it("200 ok with items", async () => {
		const req = makeRequest(
			"http://localhost/api/v1/schools/s/courses/c/problems?limit=10",
		);
		const ev = makeEv("ok", {
			req,
			params: { school: "s", course: "c" },
		});
		const res = await GET(ev);
		expect(res.status).toBe(200);
		const body = await jsonOf<{
			ok: true;
			data: Array<{ id: string; slug: string }>;
		}>(res);
		expect(body.ok).toBe(true);
		expect(Array.isArray(body.data)).toBe(true);
		expect(body.data.length).toBe(2);
		expectTraceparentEcho(res, req);
	});

	it("406 when Accept excludes json", async () => {
		const req = makeRequest(
			"http://localhost/api/v1/schools/s/courses/c/problems",
			{
				headers: { accept: "text/html" },
			},
		);
		const ev = makeEv("ok", { req, params: { school: "s", course: "c" } });
		const res = await GET(ev);
		await expectProblem(res, 406, { title: "Not Acceptable" });
		expectTraceparentEcho(res, req);
	});

	it("500 when underlying list fails", async () => {
		const { listProblemsByCourseSlugs } = await import("$lib/api/problems");
		vi.mocked(listProblemsByCourseSlugs).mockImplementationOnce(async () => {
			throw new Error("boom");
		});
		const req = makeRequest(
			"http://localhost/api/v1/schools/s/courses/c/problems",
		);
		const ev = makeEv("ok", { req, params: { school: "s", course: "c" } });
		const res = await GET(ev);
		await expectProblem(res, 500);
		expectTraceparentEcho(res, req);
	});
});
