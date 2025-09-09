import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	type EventRouteId,
	eventFactoryForEvent,
	expectProblem,
	expectTraceparentEcho,
	jsonOf,
	makeRequest,
} from "./helper";

vi.mock("$lib/api/tokens", () => ({
	findLoginToken: vi.fn(async () => ({
		email: "u@studenti.unitn.it",
		expires_at_s: Math.floor(Date.now() / 1000) + 300,
		consumed_at_s: null,
	})),
	consumeLoginToken: vi.fn(async () => {}),
}));
vi.mock("$lib/api/users", () => ({
	ensureUserActive: vi.fn(async () => ({ id: "uid-1", slug: "u" })),
}));
vi.mock("$lib/api/audit", () => ({
	logAuthEvent: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("$lib/api/rate_limit", () => ({
	enforceIpVerifyQuota: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("$lib/api/auth/session", () => ({
	signSession: vi.fn(async () => "sid_test"),
}));

const { GET, POST } = await import(
	"../../src/routes/api/v1/auth/verify/+server"
);
const { problemFrom } = await import("$lib/api/http");
const { findLoginToken, consumeLoginToken } = await import("$lib/api/tokens");
const { enforceIpVerifyQuota } = await import("$lib/api/rate_limit");

type Ev = Parameters<typeof GET>[0];
type RId = EventRouteId<Ev>;
const makeEvent = eventFactoryForEvent<Ev>("/api/v1/auth/verify" as RId);

const baseEnv = {
	AUTH_SESSION_TTL_SECONDS: "604800",
	AUTH_SESSION_SECRET: "s",
	LOG_HASH_KEY: "dev",
};

function assignEnv(ev: Ev, extra: Record<string, unknown>): Ev {
	const env = (ev as unknown as { platform: { env: Record<string, unknown> } })
		.platform.env;
	Object.assign(env, extra);
	return ev;
}

beforeEach(() => {
	vi.clearAllMocks();
});

describe("GET /api/v1/auth/verify (prod)", () => {
	it("302 redirect to /auth/continue with token", async () => {
		const req = makeRequest("http://localhost/api/v1/auth/verify?token=abc");
		const ev = assignEnv(makeEvent("ok", { req, appEnv: "prod" }), baseEnv);
		const res = await GET(ev);
		expect(res.status).toBe(302);
		expect(res.headers.get("location")).toMatch(/\/auth\/continue\?token=abc/);
	});
});

describe("GET /api/v1/auth/verify (dev ok)", () => {
	it("consumes token, sets cookie and returns user", async () => {
		const req = makeRequest("http://localhost/api/v1/auth/verify?token=abc", {
			headers: {
				traceparent: "00-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-bbbbbbbbbbbbbbbb-01",
			},
		});
		const ev = assignEnv(makeEvent("ok", { req, appEnv: "dev" }), baseEnv);
		const res = await GET(ev);
		expect(res.status).toBe(200);
		const body = await jsonOf<{
			ok: true;
			data: { userId: string; email: string; slug: string };
		}>(res);
		expect(body.ok).toBe(true);
		expect(res.headers.get("set-cookie")).toMatch(/sid=sid_test/);
		expect(res.headers.get("set-cookie")).toMatch(/HttpOnly/);
		expect(res.headers.get("set-cookie")).toMatch(/SameSite=Lax/);
		expectTraceparentEcho(res, req);
		expect(vi.mocked(consumeLoginToken)).toHaveBeenCalled();
	});
});

describe("GET /api/v1/auth/verify (dev missing token)", () => {
	it("400 token required", async () => {
		const req = makeRequest("http://localhost/api/v1/auth/verify");
		const ev = assignEnv(makeEvent("ok", { req, appEnv: "dev" }), baseEnv);
		const res = await GET(ev);
		await expectProblem(res, 400, {
			title: "Invalid argument",
			detailIncludes: "token",
		});
	});
});

describe("POST /api/v1/auth/verify", () => {
	it("accepts JSON body token", async () => {
		const req = makeRequest("http://localhost/api/v1/auth/verify", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ token: "abc" }),
		});
		const ev = assignEnv(makeEvent("ok", { req, appEnv: "dev" }), baseEnv);
		const res = await POST(ev);
		expect(res.status).toBe(200);
		const body = await jsonOf<{ ok: true }>(res);
		expect(body.ok).toBe(true);
	});

	it("406 when Accept excludes JSON", async () => {
		const req = makeRequest("http://localhost/api/v1/auth/verify", {
			method: "POST",
			headers: {
				accept: "text/html",
				"content-type": "application/json",
			},
			body: JSON.stringify({ token: "abc" }),
		});
		const ev = assignEnv(makeEvent("ok", { req, appEnv: "dev" }), baseEnv);
		const res = await POST(ev);
		await expectProblem(res, 406, { title: "Not Acceptable" });
	});

	it("400 when content-type not JSON", async () => {
		const req = makeRequest("http://localhost/api/v1/auth/verify", {
			method: "POST",
			headers: { "content-type": "text/plain" },
			body: "x",
		});
		const ev = assignEnv(makeEvent("ok", { req, appEnv: "dev" }), baseEnv);
		const res = await POST(ev);
		await expectProblem(res, 400, { title: "Invalid argument" });
	});
});

describe("POST /api/v1/auth/verify failures", () => {
	it("401 when token not found", async () => {
		vi.mocked(findLoginToken).mockResolvedValueOnce(null);
		const req = makeRequest("http://localhost/api/v1/auth/verify", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ token: "abc" }),
		});
		const ev = assignEnv(makeEvent("ok", { req, appEnv: "dev" }), baseEnv);
		const res = await POST(ev);
		await expectProblem(res, 401, { title: "Unauthenticated" });
	});

	it("401 when token already used", async () => {
		vi.mocked(findLoginToken).mockResolvedValueOnce({
			email: "u@studenti.unitn.it",
			expires_at_s: Math.floor(Date.now() / 1000) + 300,
			consumed_at_s: 1,
		});
		const req = makeRequest("http://localhost/api/v1/auth/verify", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ token: "abc" }),
		});
		const ev = assignEnv(makeEvent("ok", { req, appEnv: "dev" }), baseEnv);
		const res = await POST(ev);
		await expectProblem(res, 401, { title: "Unauthenticated" });
	});

	it("401 when token expired and consumed", async () => {
		vi.mocked(findLoginToken).mockResolvedValueOnce({
			email: "u@studenti.unitn.it",
			expires_at_s: Math.floor(Date.now() / 1000) - 1,
			consumed_at_s: null,
		});
		const req = makeRequest("http://localhost/api/v1/auth/verify", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ token: "abc" }),
		});
		const ev = assignEnv(makeEvent("ok", { req, appEnv: "dev" }), baseEnv);
		const res = await POST(ev);
		await expectProblem(res, 401, {
			title: "Unauthenticated",
			detailIncludes: "expired",
		});
		expect(vi.mocked(consumeLoginToken)).toHaveBeenCalled();
	});

	it("429 when IP verify quota exceeded", async () => {
		vi.mocked(enforceIpVerifyQuota).mockImplementationOnce(async () => {
			throw problemFrom("RESOURCE_EXHAUSTED", {
				detail: "rate limit exceeded",
			});
		});
		const req = makeRequest("http://localhost/api/v1/auth/verify", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ token: "abc" }),
		});
		const ev = assignEnv(makeEvent("ok", { req, appEnv: "dev" }), baseEnv);
		const res = await POST(ev);
		await expectProblem(res, 429, { title: "Rate limit exceeded" });
	});
});
