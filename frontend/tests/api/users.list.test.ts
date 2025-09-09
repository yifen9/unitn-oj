import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	type EventRouteId,
	eventFactoryForEvent,
	expectProblem,
	expectTraceparentEcho,
	jsonOf,
	makeRequest,
} from "./helper";

vi.mock("$lib/api/users", () => ({
	listPublicUsers: vi.fn(async () => ({
		items: [
			{
				id: "uid-2",
				slug: "b",
				name: "B",
				description: null,
				updated_at_s: 2000,
			},
			{
				id: "uid-1",
				slug: "a",
				name: "A",
				description: null,
				updated_at_s: 1000,
			},
		],
		nextCursor: "c_u",
	})),
}));

const { GET } = await import("../../src/routes/api/v1/users/+server");
const { listPublicUsers } = await import("$lib/api/users");

type Ev = Parameters<typeof GET>[0];
type RId = EventRouteId<Ev>;
const makeEvent = eventFactoryForEvent<Ev>("/api/v1/users" as RId);

function assignEnv(ev: Ev, extra: Record<string, unknown>): Ev {
	const env = (ev as unknown as { platform: { env: Record<string, unknown> } })
		.platform.env;
	Object.assign(env, extra);
	return ev;
}

beforeEach(() => vi.clearAllMocks());

describe("GET /api/v1/users (ok)", () => {
	it("200, returns items and nextCursor, echoes trace", async () => {
		const req = makeRequest("http://localhost/api/v1/users?limit=2", {
			headers: {
				traceparent: "00-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-bbbbbbbbbbbbbbbb-01",
			},
		});
		const ev = assignEnv(makeEvent("ok", { req, appEnv: "dev" }), {});
		const res = await GET(ev);
		expect(res.status).toBe(200);
		const body = await jsonOf<{
			ok: true;
			data: { items: unknown[]; nextCursor: string };
		}>(res);
		expect(body.ok).toBe(true);
		expect(Array.isArray(body.data.items)).toBe(true);
		expect(body.data.nextCursor).toBe("c_u");
		expectTraceparentEcho(res, req);
		expect(vi.mocked(listPublicUsers)).toHaveBeenCalled();
	});
});

describe("GET /api/v1/users (not acceptable)", () => {
	it("406 when Accept excludes JSON", async () => {
		const req = makeRequest("http://localhost/api/v1/users", {
			headers: { accept: "text/html" },
		});
		const ev = assignEnv(makeEvent("ok", { req, appEnv: "dev" }), {});
		const res = await GET(ev);
		await expectProblem(res, 406, { title: "Not Acceptable" });
	});
});

describe("GET /api/v1/users (db missing)", () => {
	it("500 when DB binding missing", async () => {
		const req = makeRequest("http://localhost/api/v1/users");
		const ev = assignEnv(makeEvent("none", { req, appEnv: "dev" }), {});
		const res = await GET(ev);
		await expectProblem(res, 500, { title: "Internal error" });
	});
});
