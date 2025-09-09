import { describe, expect, it, vi } from "vitest";
import { GET } from "../../src/routes/api/v1/schools/[school]/courses/+server";
import {
	type EventRouteId,
	eventFactoryForEvent,
	expectProblem,
	expectTraceparentEcho,
	jsonOf,
	makeRequest,
} from "./helper";

vi.mock("$lib/api/courses", () => ({
	listCoursesBySchoolSlug: vi.fn(async () => [
		{ id: "cid-1", slug: "cs101", name: "CS101", updated_at_s: 1 },
	]),
}));

type Ev = Parameters<typeof GET>[0];
type RId = EventRouteId<Ev>;
const makeEv = eventFactoryForEvent<Ev>(
	"/api/v1/schools/[school]/courses" as RId,
);

describe("GET /api/v1/schools/{school}/courses", () => {
	it("200 ok with items", async () => {
		const req = makeRequest(
			"http://localhost/api/v1/schools/unitn/courses?limit=10",
		);
		const ev = makeEv("ok", { req, params: { school: "unitn" } });
		const res = await GET(ev);
		const body = await jsonOf<{ ok: true; data: Array<{ slug: string }> }>(res);
		expect(body.data[0].slug).toBe("cs101");
		expectTraceparentEcho(res, req);
	});
	it("406 not acceptable", async () => {
		const req = makeRequest("http://localhost/api/v1/schools/unitn/courses", {
			headers: { accept: "text/html" },
		});
		const ev = makeEv("ok", { req, params: { school: "unitn" } });
		const res = await GET(ev);
		await expectProblem(res, 406, { title: "Not Acceptable" });
	});
	it("500 when list throws", async () => {
		const { listCoursesBySchoolSlug } = await import("$lib/api/courses");
		vi.mocked(listCoursesBySchoolSlug).mockImplementationOnce(async () => {
			throw new Error("boom");
		});
		const req = makeRequest("http://localhost/api/v1/schools/unitn/courses");
		const ev = makeEv("ok", { req, params: { school: "unitn" } });
		const res = await GET(ev);
		await expectProblem(res, 500);
	});
});
