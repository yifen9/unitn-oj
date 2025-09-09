import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	type EventRouteId,
	eventFactoryForEvent,
	expectProblem,
	jsonOf,
	makeRequest,
} from "./helper";

vi.mock("$lib/api/users", () => ({
	getUserIdBySlug: vi.fn(async (_db, slug) => (slug === "u" ? "uid-1" : null)),
}));
vi.mock("$lib/api/submissions", () => ({
	listSubmissionsByUserId: vi.fn(async () => ({
		items: [
			{
				id: "sb_1",
				user_id: "uid-1",
				problem_id: "p1",
				status: "AC",
				language: "cpp23",
				code: "x",
				code_size_byte: 1,
				run_time_ms: 1,
				run_memory_byte: 1,
				artifact: null,
				created_at_s: 1000,
				updated_at_s: 1001,
			},
		],
		nextCursor: null,
	})),
}));

const { GET } = await import(
	"../../src/routes/api/v1/users/[slug]/submissions/+server"
);
const { getUserIdBySlug } = await import("$lib/api/users");

type Ev = Parameters<typeof GET>[0];
type RId = EventRouteId<Ev>;
const makeEvent = eventFactoryForEvent<Ev>(
	"/api/v1/users/[slug]/submissions" as RId,
);

function assignEnv(ev: Ev, extra: Record<string, unknown>): Ev {
	const env = (ev as unknown as { platform: { env: Record<string, unknown> } })
		.platform.env;
	Object.assign(env, extra);
	return ev;
}

beforeEach(() => vi.clearAllMocks());

describe("GET /api/v1/users/:slug/submissions (ok)", () => {
	it("200, returns items", async () => {
		const req = makeRequest(
			"http://localhost/api/v1/users/u/submissions?limit=1",
		);
		const ev = assignEnv(
			makeEvent("ok", { req, appEnv: "dev", params: { slug: "u" } }),
			{},
		);
		const res = await GET(ev);
		expect(res.status).toBe(200);
		const body = await jsonOf<{ ok: true; data: { items: unknown[] } }>(res);
		expect(body.ok).toBe(true);
		expect(body.data.items).toHaveLength(1);
		expect(vi.mocked(getUserIdBySlug)).toHaveBeenCalled();
	});
});

describe("GET /api/v1/users/:slug/submissions (not found)", () => {
	it("404 when slug unknown", async () => {
		const req = makeRequest(
			"http://localhost/api/v1/users/unknown/submissions",
		);
		const ev = assignEnv(
			makeEvent("ok", { req, appEnv: "dev", params: { slug: "unknown" } }),
			{},
		);
		const res = await GET(ev);
		await expectProblem(res, 404, { title: "Not found" });
	});
});
