import { describe, expect, it, vi } from "vitest";
import { GET } from "../../src/routes/api/v1/schools/[school]/+server";
import {
	type EventRouteId,
	eventFactoryForEvent,
	expectProblem,
	expectTraceparentEcho,
	jsonOf,
	makeRequest,
} from "./helper";

vi.mock("$lib/api/schools", () => ({
	getSchoolBySlug: vi.fn(async (_db, slug: string) =>
		slug === "unitn"
			? {
					id: "sid-1",
					slug: "unitn",
					name: "UNITN",
					description: null,
					updated_at_s: 1,
				}
			: null,
	),
}));

type Ev = Parameters<typeof GET>[0];
type RId = EventRouteId<Ev>;
const makeEv = eventFactoryForEvent<Ev>("/api/v1/schools/[school]" as RId);

describe("GET /api/v1/schools/{school}", () => {
	it("200 ok", async () => {
		const req = makeRequest("http://localhost/api/v1/schools/unitn");
		const ev = makeEv("ok", { req, params: { school: "unitn" } });
		const res = await GET(ev);
		const body = await jsonOf<{ ok: true; data: { slug: string } }>(res);
		expect(body.data.slug).toBe("unitn");
		expectTraceparentEcho(res, req);
	});
	it("404 not found", async () => {
		const req = makeRequest("http://localhost/api/v1/schools/unknown");
		const ev = makeEv("ok", { req, params: { school: "unknown" } });
		const res = await GET(ev);
		await expectProblem(res, 404, { title: "Not found" });
	});
	it("406 when Accept excludes json", async () => {
		const req = makeRequest("http://localhost/api/v1/schools/unitn", {
			headers: { accept: "text/plain" },
		});
		const ev = makeEv("ok", { req, params: { school: "unitn" } });
		const res = await GET(ev);
		await expectProblem(res, 406, { title: "Not Acceptable" });
	});
	it("500 when query throws", async () => {
		const { getSchoolBySlug } = await import("$lib/api/schools");
		vi.mocked(getSchoolBySlug).mockImplementationOnce(async () => {
			throw new Error("db");
		});
		const req = makeRequest("http://localhost/api/v1/schools/unitn");
		const ev = makeEv("ok", { req, params: { school: "unitn" } });
		const res = await GET(ev);
		await expectProblem(res, 500);
	});
});
