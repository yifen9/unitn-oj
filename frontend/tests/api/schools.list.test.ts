import { describe, expect, it, vi } from "vitest";
import { GET } from "../../src/routes/api/v1/schools/+server";
import {
	type EventRouteId,
	eventFactoryForEvent,
	expectProblem,
	expectTraceparentEcho,
	jsonOf,
	makeRequest,
} from "./helper";

vi.mock("$lib/api/schools", () => ({
	listSchools: vi.fn(async () => [
		{ id: "sid-1", slug: "unitn", name: "UNITN", updated_at_s: 1 },
	]),
}));

type Ev = Parameters<typeof GET>[0];
type RId = EventRouteId<Ev>;
const makeEv = eventFactoryForEvent<Ev>("/api/v1/schools" as RId);

describe("GET /api/v1/schools", () => {
	it("200 ok with items", async () => {
		const req = makeRequest("http://localhost/api/v1/schools?limit=10");
		const ev = makeEv("ok", { req });
		const res = await GET(ev);
		const body = await jsonOf<{
			ok: true;
			data: Array<{ id: string; slug: string }>;
		}>(res);
		expect(body.ok).toBe(true);
		expect(body.data[0].slug).toBe("unitn");
		expectTraceparentEcho(res, req);
	});
	it("406 when Accept excludes json", async () => {
		const req = makeRequest("http://localhost/api/v1/schools", {
			headers: { accept: "text/html" },
		});
		const ev = makeEv("ok", { req });
		const res = await GET(ev);
		await expectProblem(res, 406, { title: "Not Acceptable" });
		expectTraceparentEcho(res, req);
	});
	it("500 when list throws", async () => {
		const { listSchools } = await import("$lib/api/schools");
		vi.mocked(listSchools).mockImplementationOnce(async () => {
			throw new Error("boom");
		});
		const req = makeRequest("http://localhost/api/v1/schools");
		const ev = makeEv("ok", { req });
		const res = await GET(ev);
		await expectProblem(res, 500);
	});
});
