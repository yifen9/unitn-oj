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
	getSubmissionById: vi.fn(async () => ({
		id: "sb_x",
		user_id: "uid-1",
		problem_id: "p1",
		status: "AC",
		language: "cpp23",
		code: "int main(){}",
		code_size_byte: 12,
		run_time_ms: 12,
		run_memory_byte: 4096,
		artifact: null,
		created_at_s: 1000,
		updated_at_s: 1001,
	})),
}));

const { GET } = await import(
	"../../src/routes/api/v1/submissions/[id]/+server"
);
const { getSubmissionById } = await import("$lib/api/submissions");

type Ev = Parameters<typeof GET>[0];
type RId = EventRouteId<Ev>;
const makeEvent = eventFactoryForEvent<Ev>("/api/v1/submissions/[id]" as RId);

function assignEnv(ev: Ev, extra: Record<string, unknown>): Ev {
	const env = (ev as unknown as { platform: { env: Record<string, unknown> } })
		.platform.env;
	Object.assign(env, extra);
	return ev;
}

beforeEach(() => vi.clearAllMocks());

describe("GET /api/v1/submissions/:id (ok)", () => {
	it("200 with JSON body and trace", async () => {
		const req = makeRequest("http://localhost/api/v1/submissions/sb_x", {
			headers: {
				traceparent: "00-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-bbbbbbbbbbbbbbbb-01",
			},
		});
		const ev = assignEnv(
			makeEvent("ok", { req, appEnv: "dev", params: { id: "sb_x" } }),
			{},
		);
		const res = await GET(ev);
		expect(res.status).toBe(200);
		const body = await jsonOf<{
			ok: true;
			data: { id: string; status: string };
		}>(res);
		expect(body.ok).toBe(true);
		expect(body.data.id).toBe("sb_x");
		expect(body.data.status).toBe("AC");
		expectTraceparentEcho(res, req);
	});
});

describe("GET /api/v1/submissions/:id (not acceptable)", () => {
	it("406 when Accept excludes JSON", async () => {
		const req = makeRequest("http://localhost/api/v1/submissions/sb_x", {
			headers: { accept: "text/html" },
		});
		const ev = assignEnv(
			makeEvent("ok", { req, appEnv: "dev", params: { id: "sb_x" } }),
			{},
		);
		const res = await GET(ev);
		await expectProblem(res, 406, { title: "Not Acceptable" });
	});
});

describe("GET /api/v1/submissions/:id (not found)", () => {
	it("404 when submission missing", async () => {
		vi.mocked(getSubmissionById).mockResolvedValueOnce(null);
		const req = makeRequest("http://localhost/api/v1/submissions/unknown");
		const ev = assignEnv(
			makeEvent("ok", { req, appEnv: "dev", params: { id: "unknown" } }),
			{},
		);
		const res = await GET(ev);
		await expectProblem(res, 404, { title: "Not found" });
	});
});
