import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	type EventRouteId,
	eventFactoryForEvent,
	expectProblem,
	expectTraceparentEcho,
	jsonOf,
	makeRequest,
} from "./helper";

vi.mock("$lib/api/submissions", () => ({
	listSubmissionsByProblem: vi.fn(async () => ({
		items: [
			{
				id: "sb_2",
				user_id: "u2",
				problem_id: "p1",
				status: "AC",
				language: "cpp23",
				code: "x",
				code_size_byte: 1,
				run_time_ms: 1,
				run_memory_byte: 1,
				artifact: null,
				created_at_s: 2000,
				updated_at_s: 2001,
			},
			{
				id: "sb_1",
				user_id: "u1",
				problem_id: "p1",
				status: "WA",
				language: "cpp23",
				code: "y",
				code_size_byte: 1,
				run_time_ms: 1,
				run_memory_byte: 1,
				artifact: null,
				created_at_s: 1000,
				updated_at_s: 1001,
			},
		],
		nextCursor: "c_1",
	})),
}));

const { GET } = await import(
	"../../src/routes/api/v1/problems/[id]/submissions/+server"
);
const { listSubmissionsByProblem } = await import("$lib/api/submissions");

type Ev = Parameters<typeof GET>[0];
type RId = EventRouteId<Ev>;
const makeEvent = eventFactoryForEvent<Ev>(
	"/api/v1/problems/[id]/submissions" as RId,
);

function assignEnv(ev: Ev, extra: Record<string, unknown>): Ev {
	const env = (ev as unknown as { platform: { env: Record<string, unknown> } })
		.platform.env;
	Object.assign(env, extra);
	return ev;
}

beforeEach(() => vi.clearAllMocks());

describe("GET /api/v1/problems/:id/submissions (ok)", () => {
	it("200, returns items and nextCursor, echoes trace", async () => {
		const req = makeRequest(
			"http://localhost/api/v1/problems/p1/submissions?limit=2",
			{
				headers: {
					traceparent:
						"00-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-bbbbbbbbbbbbbbbb-01",
				},
			},
		);
		const ev = assignEnv(
			makeEvent("ok", { req, appEnv: "dev", params: { id: "p1" } }),
			{},
		);
		const res = await GET(ev);
		expect(res.status).toBe(200);
		const body = await jsonOf<{
			ok: true;
			data: { items: unknown[]; nextCursor: string };
		}>(res);
		expect(body.ok).toBe(true);
		expect(Array.isArray(body.data.items)).toBe(true);
		expect(body.data.nextCursor).toBe("c_1");
		expectTraceparentEcho(res, req);
		expect(vi.mocked(listSubmissionsByProblem)).toHaveBeenCalled();
	});
});

describe("GET /api/v1/problems/:id/submissions (not acceptable)", () => {
	it("406 when Accept excludes JSON", async () => {
		const req = makeRequest(
			"http://localhost/api/v1/problems/p1/submissions?limit=1",
			{ headers: { accept: "text/html" } },
		);
		const ev = assignEnv(
			makeEvent("ok", { req, appEnv: "dev", params: { id: "p1" } }),
			{},
		);
		const res = await GET(ev);
		await expectProblem(res, 406, { title: "Not Acceptable" });
	});
});

describe("GET /api/v1/problems/:id/submissions (db missing)", () => {
	it("500 when DB binding missing", async () => {
		const req = makeRequest("http://localhost/api/v1/problems/p1/submissions");
		const ev = assignEnv(
			makeEvent("none", { req, appEnv: "dev", params: { id: "p1" } }),
			{},
		);
		const res = await GET(ev);
		await expectProblem(res, 500, { title: "Internal error" });
	});
});
