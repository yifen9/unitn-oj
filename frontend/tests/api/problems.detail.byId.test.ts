import { describe, expect, it, vi } from "vitest";
import { GET } from "../../src/routes/api/v1/problems/[id]/+server";
import {
	type EventRouteId,
	eventFactoryForEvent,
	expectProblem,
	expectTraceparentEcho,
	jsonOf,
	makeRequest,
} from "./helper";

vi.mock("$lib/api/problems", () => ({
	getProblemById: vi.fn(async (_db, id: string) =>
		id === "pid-1"
			? {
					id: "pid-1",
					course_id: "cid-1",
					slug: "p",
					name: "P",
					description: "desc",
					language_limit: JSON.stringify({ allow: ["cpp", "py"] }),
					code_size_limit_byte: 1024,
					time_limit_ms: 2000,
					memory_limit_byte: 262144,
					artifact: null,
					updated_at_s: 123,
				}
			: null,
	),
}));

type Ev = Parameters<typeof GET>[0];
type RId = EventRouteId<Ev>;
const makeEv = eventFactoryForEvent<Ev>("/api/v1/problems/[id]" as RId);

describe("GET /api/v1/problems/{id}", () => {
	it("200 ok with parsed limits", async () => {
		const req = makeRequest("http://localhost/api/v1/problems/pid-1");
		const ev = makeEv("ok", { req, params: { id: "pid-1" } });
		const res = await GET(ev);
		expect(res.status).toBe(200);
		const body = await jsonOf<{
			ok: true;
			data: { id: string; limits: { codeSizeByte: number } };
		}>(res);
		expect(body.ok).toBe(true);
		expect(body.data.id).toBe("pid-1");
		expect(body.data.limits.codeSizeByte).toBe(1024);
		expectTraceparentEcho(res, req);
	});

	it("404 when not found", async () => {
		const req = makeRequest("http://localhost/api/v1/problems/unknown");
		const ev = makeEv("ok", { req, params: { id: "unknown" } });
		const res = await GET(ev);
		await expectProblem(res, 404, { title: "Not found" });
		expectTraceparentEcho(res, req);
	});

	it("406 when Accept excludes json", async () => {
		const req = makeRequest("http://localhost/api/v1/problems/pid-1", {
			headers: { accept: "text/html" },
		});
		const ev = makeEv("ok", { req, params: { id: "pid-1" } });
		const res = await GET(ev);
		await expectProblem(res, 406, { title: "Not Acceptable" });
		expectTraceparentEcho(res, req);
	});

	it("500 when underlying query throws", async () => {
		const { getProblemById } = await import("$lib/api/problems");
		vi.mocked(getProblemById).mockImplementationOnce(async () => {
			throw new Error("boom");
		});
		const req = makeRequest("http://localhost/api/v1/problems/pid-1");
		const ev = makeEv("ok", { req, params: { id: "pid-1" } });
		const res = await GET(ev);
		await expectProblem(res, 500);
		expectTraceparentEcho(res, req);
	});
});
