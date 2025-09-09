import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	type EventRouteId,
	eventFactoryForEvent,
	expectProblem,
	expectTraceparentEcho,
	jsonOf,
	makeRequest,
} from "./helper";

vi.mock("$lib/api/auth/session", () => ({
	verifySession: vi.fn(async () => "u@studenti.unitn.it"),
}));
vi.mock("$lib/api/users", () => ({
	getUserByEmail: vi.fn(async () => ({
		id: "uid-1",
		email: "u@studenti.unitn.it",
		slug: "u",
		name: "U",
		description: "hi",
		is_active: 1,
	})),
}));

const { GET } = await import("../../src/routes/api/v1/users/me/+server");
const { verifySession } = await import("$lib/api/auth/session");
const { getUserByEmail } = await import("$lib/api/users");

type Ev = Parameters<typeof GET>[0];
type RId = EventRouteId<Ev>;
const makeEvent = eventFactoryForEvent<Ev>("/api/v1/users/me" as RId);

const baseEnv = { AUTH_SESSION_SECRET: "s" };

function assignEnv(ev: Ev, extra: Record<string, unknown>): Ev {
	const env = (ev as unknown as { platform: { env: Record<string, unknown> } })
		.platform.env;
	Object.assign(env, extra);
	return ev;
}

beforeEach(() => {
	vi.clearAllMocks();
});

describe("GET /api/v1/users/me (ok)", () => {
	it("returns self view with no-store and trace", async () => {
		const req = makeRequest("http://localhost/api/v1/users/me", {
			headers: {
				cookie: "sid=abc",
				traceparent: "00-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-bbbbbbbbbbbbbbbb-01",
			},
		});
		const ev = assignEnv(makeEvent("ok", { req, appEnv: "dev" }), baseEnv);
		const res = await GET(ev);
		expect(res.status).toBe(200);
		expect(res.headers.get("cache-control")).toMatch(/no-store/i);
		expect(res.headers.get("content-type")).toMatch(/application\/json/i);
		const body = await jsonOf<{ ok: true; data: Record<string, unknown> }>(res);
		expect(body.ok).toBe(true);
		expect(body.data.email).toBe("u@studenti.unitn.it");
		expect(body.data.slug).toBe("u");
		expectTraceparentEcho(res, req);
	});
});

describe("GET /api/v1/users/me (not acceptable)", () => {
	it("406 when Accept excludes JSON", async () => {
		const req = makeRequest("http://localhost/api/v1/users/me", {
			headers: { accept: "text/html", cookie: "sid=abc" },
		});
		const ev = assignEnv(makeEvent("ok", { req, appEnv: "dev" }), baseEnv);
		const res = await GET(ev);
		await expectProblem(res, 406, { title: "Not Acceptable" });
	});
});

describe("GET /api/v1/users/me (missing DB)", () => {
	it("500 when DB binding missing", async () => {
		const req = makeRequest("http://localhost/api/v1/users/me", {
			headers: { cookie: "sid=abc" },
		});
		const ev = assignEnv(makeEvent("none", { req, appEnv: "dev" }), baseEnv);
		const res = await GET(ev);
		await expectProblem(res, 500, { title: "Internal error" });
	});
});

describe("GET /api/v1/users/me (auth failures)", () => {
	it("401 when no cookie", async () => {
		const req = makeRequest("http://localhost/api/v1/users/me");
		const ev = assignEnv(makeEvent("ok", { req, appEnv: "dev" }), baseEnv);
		const res = await GET(ev);
		await expectProblem(res, 401, { title: "Unauthenticated" });
	});

	it("401 when verifySession returns null", async () => {
		vi.mocked(verifySession).mockResolvedValueOnce(null as unknown as string);
		const req = makeRequest("http://localhost/api/v1/users/me", {
			headers: { cookie: "sid=bad" },
		});
		const ev = assignEnv(makeEvent("ok", { req, appEnv: "dev" }), baseEnv);
		const res = await GET(ev);
		await expectProblem(res, 401, { title: "Unauthenticated" });
	});

	it("401 when user not found", async () => {
		vi.mocked(getUserByEmail).mockResolvedValueOnce(null);
		const req = makeRequest("http://localhost/api/v1/users/me", {
			headers: { cookie: "sid=abc" },
		});
		const ev = assignEnv(makeEvent("ok", { req, appEnv: "dev" }), baseEnv);
		const res = await GET(ev);
		await expectProblem(res, 401, { title: "Unauthenticated" });
	});
});
