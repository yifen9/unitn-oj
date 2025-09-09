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
		name: null,
		description: null,
		is_active: 1,
	})),
}));
vi.mock("$lib/api/problems", () => ({
	getProblemLimits: vi.fn(async () => ({
		id: "p1",
		code_size_limit_byte: 8_000,
		time_limit_ms: 1000,
		memory_limit_byte: 131072,
		language_limit: ["cpp23", "python3"],
	})),
}));
vi.mock("$lib/api/submissions", () => ({
	createSubmission: vi.fn(async () => ({
		id: "sb_x",
		user_id: "uid-1",
		problem_id: "p1",
		status: "IQ",
		language: "cpp23",
		code: "int main(){}",
		code_size_byte: 12,
		run_time_ms: null,
		run_memory_byte: null,
		artifact: null,
		created_at_s: 1000,
		updated_at_s: 1000,
	})),
}));
vi.mock("$lib/api/queues", () => ({
	sendSubmissionJob: vi.fn(async () => {}),
}));

const { POST } = await import(
	"../../src/routes/api/v1/problems/[id]/submissions/+server"
);
const { verifySession } = await import("$lib/api/auth/session");
const { getProblemLimits } = await import("$lib/api/problems");
const { createSubmission } = await import("$lib/api/submissions");
const { sendSubmissionJob } = await import("$lib/api/queues");

type Ev = Parameters<typeof POST>[0];
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

describe("POST /api/v1/problems/:id/submissions (ok)", () => {
	it("201 created, enqueued, location and trace", async () => {
		const req = makeRequest("http://localhost/api/v1/problems/p1/submissions", {
			method: "POST",
			headers: {
				"content-type": "application/json",
				cookie: "sid=abc",
				traceparent: "00-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-bbbbbbbbbbbbbbbb-01",
			},
			body: JSON.stringify({ code: "int main(){}", language: "cpp23" }),
		});
		const ev = assignEnv(
			makeEvent("ok", { req, appEnv: "dev", params: { id: "p1" } }),
			{ AUTH_SESSION_SECRET: "s", QUEUE: { send: async () => {} } },
		);
		const res = await POST(ev);
		expect(res.status).toBe(201);
		expect(res.headers.get("location")).toBe("/api/v1/submissions/sb_x");
		const body = await jsonOf<{
			ok: true;
			data: { id: string; status: string };
		}>(res);
		expect(body.ok).toBe(true);
		expect(body.data.id).toBe("sb_x");
		expect(body.data.status).toBe("IQ");
		expect(vi.mocked(createSubmission)).toHaveBeenCalled();
		expect(vi.mocked(sendSubmissionJob)).toHaveBeenCalled();
		expectTraceparentEcho(res, req);
	});
});

describe("POST /api/v1/problems/:id/submissions (validation/auth)", () => {
	it("406 when Accept excludes JSON", async () => {
		const req = makeRequest("http://localhost/api/v1/problems/p1/submissions", {
			method: "POST",
			headers: {
				accept: "text/html",
				"content-type": "application/json",
				cookie: "sid=abc",
			},
			body: JSON.stringify({ code: "x", language: "cpp23" }),
		});
		const ev = assignEnv(
			makeEvent("ok", { req, appEnv: "dev", params: { id: "p1" } }),
			{ AUTH_SESSION_SECRET: "s", QUEUE: { send: async () => {} } },
		);
		const res = await POST(ev);
		await expectProblem(res, 406, { title: "Not Acceptable" });
	});

	it("400 when body not JSON", async () => {
		const req = makeRequest("http://localhost/api/v1/problems/p1/submissions", {
			method: "POST",
			headers: { cookie: "sid=abc", "content-type": "text/plain" },
			body: "x",
		});
		const ev = assignEnv(
			makeEvent("ok", { req, appEnv: "dev", params: { id: "p1" } }),
			{ AUTH_SESSION_SECRET: "s", QUEUE: { send: async () => {} } },
		);
		const res = await POST(ev);
		await expectProblem(res, 400, { title: "Invalid argument" });
	});

	it("401 when no session cookie", async () => {
		const req = makeRequest("http://localhost/api/v1/problems/p1/submissions", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ code: "x", language: "cpp23" }),
		});
		const ev = assignEnv(
			makeEvent("ok", { req, appEnv: "dev", params: { id: "p1" } }),
			{ AUTH_SESSION_SECRET: "s", QUEUE: { send: async () => {} } },
		);
		const res = await POST(ev);
		await expectProblem(res, 401, { title: "Unauthenticated" });
	});

	it("401 when verifySession fails", async () => {
		vi.mocked(verifySession).mockResolvedValueOnce(null);
		const req = makeRequest("http://localhost/api/v1/problems/p1/submissions", {
			method: "POST",
			headers: { "content-type": "application/json", cookie: "sid=bad" },
			body: JSON.stringify({ code: "x", language: "cpp23" }),
		});
		const ev = assignEnv(
			makeEvent("ok", { req, appEnv: "dev", params: { id: "p1" } }),
			{ AUTH_SESSION_SECRET: "s", QUEUE: { send: async () => {} } },
		);
		const res = await POST(ev);
		await expectProblem(res, 401, { title: "Unauthenticated" });
	});

	it("404 when problem not found", async () => {
		vi.mocked(getProblemLimits).mockResolvedValueOnce(null);
		const req = makeRequest("http://localhost/api/v1/problems/p1/submissions", {
			method: "POST",
			headers: { "content-type": "application/json", cookie: "sid=abc" },
			body: JSON.stringify({ code: "x", language: "cpp23" }),
		});
		const ev = assignEnv(
			makeEvent("ok", { req, appEnv: "dev", params: { id: "p1" } }),
			{ AUTH_SESSION_SECRET: "s", QUEUE: { send: async () => {} } },
		);
		const res = await POST(ev);
		await expectProblem(res, 404, { title: "Not found" });
	});

	it("400 when language not allowed", async () => {
		vi.mocked(getProblemLimits).mockResolvedValueOnce({
			id: "p1",
			code_size_limit_byte: 8000,
			time_limit_ms: 1000,
			memory_limit_byte: 131072,
			language_limit: ["python3"],
		});
		const req = makeRequest("http://localhost/api/v1/problems/p1/submissions", {
			method: "POST",
			headers: { "content-type": "application/json", cookie: "sid=abc" },
			body: JSON.stringify({ code: "x", language: "cpp23" }),
		});
		const ev = assignEnv(
			makeEvent("ok", { req, appEnv: "dev", params: { id: "p1" } }),
			{ AUTH_SESSION_SECRET: "s", QUEUE: { send: async () => {} } },
		);
		const res = await POST(ev);
		await expectProblem(res, 400, { title: "Invalid argument" });
	});

	it("412 when code too large", async () => {
		vi.mocked(getProblemLimits).mockResolvedValueOnce({
			id: "p1",
			code_size_limit_byte: 1,
			time_limit_ms: 1000,
			memory_limit_byte: 131072,
			language_limit: ["cpp23"],
		});
		const req = makeRequest("http://localhost/api/v1/problems/p1/submissions", {
			method: "POST",
			headers: { "content-type": "application/json", cookie: "sid=abc" },
			body: JSON.stringify({ code: "too long", language: "cpp23" }),
		});
		const ev = assignEnv(
			makeEvent("ok", { req, appEnv: "dev", params: { id: "p1" } }),
			{ AUTH_SESSION_SECRET: "s", QUEUE: { send: async () => {} } },
		);
		const res = await POST(ev);
		await expectProblem(res, 412, { title: "Failed precondition" });
	});

	it("500 when queue unavailable", async () => {
		const req = makeRequest("http://localhost/api/v1/problems/p1/submissions", {
			method: "POST",
			headers: { "content-type": "application/json", cookie: "sid=abc" },
			body: JSON.stringify({ code: "x", language: "cpp23" }),
		});
		const ev = assignEnv(
			makeEvent("ok", { req, appEnv: "dev", params: { id: "p1" } }),
			{ AUTH_SESSION_SECRET: "s" },
		);
		const res = await POST(ev);
		await expectProblem(res, 500, { title: "Internal error" });
	});
});
