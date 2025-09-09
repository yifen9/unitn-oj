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
	getPublicUserBySlug: vi.fn(async () => ({
		id: "uid-1",
		slug: "u",
		name: "U",
		description: "hi",
		updated_at_s: 1000,
		is_active: 1,
	})),
}));

const { GET, HEAD } = await import(
	"../../src/routes/api/v1/users/[slug]/+server"
);
const { getPublicUserBySlug } = await import("$lib/api/users");

type Ev = Parameters<typeof GET>[0];
type RId = EventRouteId<Ev>;
const makeEvent = eventFactoryForEvent<Ev>("/api/v1/users/[slug]" as RId);

beforeEach(() => {
	vi.clearAllMocks();
});

function assignEnv(ev: Ev, extra: Record<string, unknown>): Ev {
	const env = (ev as unknown as { platform: { env: Record<string, unknown> } })
		.platform.env;
	Object.assign(env, extra);
	return ev;
}

describe("GET /api/v1/users/:slug (ok + ETag)", () => {
	it("returns 200 with public, max-age and ETag; supports trace", async () => {
		const req = makeRequest("http://localhost/api/v1/users/u", {
			headers: {
				traceparent: "00-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-bbbbbbbbbbbbbbbb-01",
			},
		});
		const ev = assignEnv(
			makeEvent("ok", { req, appEnv: "dev", params: { slug: "u" } }),
			{},
		);
		const res = await GET(ev);
		expect(res.status).toBe(200);
		expect(res.headers.get("cache-control")).toMatch(/public/i);
		expect(res.headers.get("cache-control")).toMatch(/max-age=\d+/i);
		expect(res.headers.get("cache-control")).toMatch(/must-revalidate/i);
		const etag = res.headers.get("etag");
		expect(etag).toBeTruthy();
		const body = await jsonOf<{ ok: true; data: { id: string; slug: string } }>(
			res,
		);
		expect(body.ok).toBe(true);
		expect(body.data.slug).toBe("u");
		expectTraceparentEcho(res, req);
	});
});

describe("GET /api/v1/users/:slug (304 on If-None-Match)", () => {
	it("returns 304 when ETag matches", async () => {
		const firstReq = makeRequest("http://localhost/api/v1/users/u");
		const ev1 = assignEnv(
			makeEvent("ok", { req: firstReq, appEnv: "dev", params: { slug: "u" } }),
			{},
		);
		const r1 = await GET(ev1);
		const etag = r1.headers.get("etag") ?? "";
		const req2 = makeRequest("http://localhost/api/v1/users/u", {
			headers: { "if-none-match": etag },
		});
		const ev2 = assignEnv(
			makeEvent("ok", { req: req2, appEnv: "dev", params: { slug: "u" } }),
			{},
		);
		const r2 = await GET(ev2);
		expect(r2.status).toBe(304);
		expect(r2.headers.get("etag")).toBe(etag);
	});
});

describe("HEAD /api/v1/users/:slug", () => {
	it("200 with headers but no body", async () => {
		const req = makeRequest("http://localhost/api/v1/users/u", {
			method: "HEAD",
		});
		const ev = assignEnv(
			makeEvent("ok", { req, appEnv: "dev", params: { slug: "u" } }),
			{},
		);
		const res = await HEAD(ev);
		expect(res.status).toBe(200);
		expect(res.headers.get("etag")).toBeTruthy();
		expect(res.headers.get("cache-control")).toMatch(/public/i);
		expect(await res.text()).toBe("");
	});

	it("304 when ETag matches", async () => {
		const first = makeRequest("http://localhost/api/v1/users/u", {
			method: "HEAD",
		});
		const ev1 = assignEnv(
			makeEvent("ok", { req: first, appEnv: "dev", params: { slug: "u" } }),
			{},
		);
		const r1 = await HEAD(ev1);
		const etag = r1.headers.get("etag") ?? "";
		const req2 = makeRequest("http://localhost/api/v1/users/u", {
			method: "HEAD",
			headers: { "if-none-match": etag },
		});
		const ev2 = assignEnv(
			makeEvent("ok", { req: req2, appEnv: "dev", params: { slug: "u" } }),
			{},
		);
		const r2 = await HEAD(ev2);
		expect(r2.status).toBe(304);
	});
});

describe("GET /api/v1/users/:slug (not acceptable)", () => {
	it("406 when Accept excludes JSON", async () => {
		const req = makeRequest("http://localhost/api/v1/users/u", {
			headers: { accept: "text/html" },
		});
		const ev = assignEnv(
			makeEvent("ok", { req, appEnv: "dev", params: { slug: "u" } }),
			{},
		);
		const res = await GET(ev);
		await expectProblem(res, 406, { title: "Not Acceptable" });
	});
});

describe("GET /api/v1/users/:slug (not found)", () => {
	it("404 when user missing", async () => {
		vi.mocked(getPublicUserBySlug).mockResolvedValueOnce(null);
		const req = makeRequest("http://localhost/api/v1/users/unknown");
		const ev = assignEnv(
			makeEvent("ok", { req, appEnv: "dev", params: { slug: "unknown" } }),
			{},
		);
		const res = await GET(ev);
		await expectProblem(res, 404, { title: "Not found" });
	});
});
