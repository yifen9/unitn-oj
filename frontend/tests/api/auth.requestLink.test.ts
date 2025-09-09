import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	type EventRouteId,
	eventFactoryForEvent,
	expectProblem,
	expectTraceparentEcho,
	jsonOf,
	makeRequest,
} from "./helper";

vi.mock("$lib/api/rate_limit", () => ({
	enforceEmailIssueQuota: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("$lib/api/audit", () => ({
	logAuthEvent: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("$lib/api/tokens", () => ({
	createLoginToken: vi.fn(async () => ({ token: "tok_abc" })),
}));
vi.mock("$lib/api/turnstile", () => ({
	verifyTurnstile: vi.fn(async () => true),
}));
vi.mock("$lib/api/email/resend", () => ({
	sendEmail: vi.fn(async () => {}),
}));

const { POST } = await import(
	"../../src/routes/api/v1/auth/requestLink/+server"
);
const { problemFrom } = await import("$lib/api/http");
const { enforceEmailIssueQuota } = await import("$lib/api/rate_limit");
const { verifyTurnstile } = await import("$lib/api/turnstile");
const { sendEmail } = await import("$lib/api/email/resend");

type ReqEvent = Parameters<typeof POST>[0];
type RId = EventRouteId<ReqEvent>;
const makeEvent = eventFactoryForEvent<ReqEvent>(
	"/api/v1/auth/requestLink" as RId,
);

const baseEnv = {
	AUTH_ALLOWED_DOMAIN: "studenti.unitn.it",
	AUTH_TOKEN_TTL_SECONDS: "300",
	LOG_HASH_KEY: "dev",
};

function assignEnv(ev: ReqEvent, extra: Record<string, unknown>): ReqEvent {
	const env = (ev as unknown as { platform: { env: Record<string, unknown> } })
		.platform.env;
	Object.assign(env, extra);
	return ev;
}

beforeEach(() => {
	vi.clearAllMocks();
});

describe("POST /api/v1/auth/requestLink (dev ok)", () => {
	it("returns magicUrl with token and traces", async () => {
		const body = { email: "u@studenti.unitn.it" };
		const req = makeRequest("http://localhost/api/v1/auth/requestLink", {
			method: "POST",
			headers: {
				"content-type": "application/json",
				traceparent: "00-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-bbbbbbbbbbbbbbbb-01",
			},
			body: JSON.stringify(body),
		});
		const ev = assignEnv(makeEvent("ok", { req, appEnv: "dev" }), baseEnv);
		const res = await POST(ev);
		expect(res.status).toBe(200);
		const j = await jsonOf<{ ok: true; data: { magicUrl: string } }>(res);
		expect(j.ok).toBe(true);
		expect(j.data.magicUrl).toMatch(/\/auth\/continue\?token=tok_abc/);
		expectTraceparentEcho(res, req);
	});
});

describe("POST /api/v1/auth/requestLink (content-type required)", () => {
	it("returns 400 when content-type not JSON", async () => {
		const req = makeRequest("http://localhost/api/v1/auth/requestLink", {
			method: "POST",
			headers: { "content-type": "text/plain" },
			body: "x",
		});
		const ev = assignEnv(makeEvent("ok", { req, appEnv: "dev" }), baseEnv);
		const res = await POST(ev);
		await expectProblem(res, 400, { title: "Invalid argument" });
	});
});

describe("POST /api/v1/auth/requestLink (accept must allow json)", () => {
	it("returns 406 when Accept excludes JSON", async () => {
		const req = makeRequest("http://localhost/api/v1/auth/requestLink", {
			method: "POST",
			headers: { accept: "text/html", "content-type": "application/json" },
			body: JSON.stringify({ email: "u@studenti.unitn.it" }),
		});
		const ev = assignEnv(makeEvent("ok", { req, appEnv: "dev" }), baseEnv);
		const res = await POST(ev);
		await expectProblem(res, 406, { title: "Not Acceptable" });
	});
});

describe("POST /api/v1/auth/requestLink (domain check)", () => {
	it("rejects non-allowed domain", async () => {
		const req = makeRequest("http://localhost/api/v1/auth/requestLink", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ email: "u@gmail.com" }),
		});
		const ev = assignEnv(makeEvent("ok", { req, appEnv: "dev" }), baseEnv);
		const res = await POST(ev);
		await expectProblem(res, 400, {
			title: "Invalid argument",
			detailIncludes: "@studenti.unitn.it",
		});
	});
});

describe("POST /api/v1/auth/requestLink (prod turnstile)", () => {
	it("requires token in prod", async () => {
		const req = makeRequest("http://localhost/api/v1/auth/requestLink", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ email: "u@studenti.unitn.it" }),
		});
		const ev = assignEnv(makeEvent("ok", { req, appEnv: "prod" }), {
			...baseEnv,
			TURNSTILE_SECRET: "tsec",
			RESEND_API_KEY: "rk",
		});
		const res = await POST(ev);
		await expectProblem(res, 403, {
			title: "Permission denied",
			detailIncludes: "turnstile",
		});
	});

	it("403 on turnstile verification failure", async () => {
		vi.mocked(verifyTurnstile).mockResolvedValueOnce(false);
		const req = makeRequest("http://localhost/api/v1/auth/requestLink", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				email: "u@studenti.unitn.it",
				"cf-turnstile-response": "x",
			}),
		});
		const ev = assignEnv(makeEvent("ok", { req, appEnv: "prod" }), {
			...baseEnv,
			TURNSTILE_SECRET: "tsec",
			RESEND_API_KEY: "rk",
		});
		const res = await POST(ev);
		await expectProblem(res, 403, { title: "Permission denied" });
	});

	it("200 ok after sending email", async () => {
		const req = makeRequest("http://localhost/api/v1/auth/requestLink", {
			method: "POST",
			headers: {
				"content-type": "application/json",
				traceparent: "00-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-bbbbbbbbbbbbbbbb-01",
			},
			body: JSON.stringify({
				email: "u@studenti.unitn.it",
				"cf-turnstile-response": "ok",
			}),
		});
		const ev = assignEnv(makeEvent("ok", { req, appEnv: "prod" }), {
			...baseEnv,
			TURNSTILE_SECRET: "tsec",
			RESEND_API_KEY: "rk",
		});
		const res = await POST(ev);
		expect(res.status).toBe(200);
		const j = await jsonOf<{ ok: true }>(res);
		expect(j.ok).toBe(true);
		expectTraceparentEcho(res, req);
		expect(vi.mocked(sendEmail)).toHaveBeenCalled();
	});

	it("500 when email provider fails", async () => {
		vi.mocked(sendEmail).mockImplementationOnce(async () => {
			throw problemFrom("INTERNAL", { detail: "send email failed" });
		});
		const req = makeRequest("http://localhost/api/v1/auth/requestLink", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				email: "u@studenti.unitn.it",
				"cf-turnstile-response": "ok",
			}),
		});
		const ev = assignEnv(makeEvent("ok", { req, appEnv: "prod" }), {
			...baseEnv,
			TURNSTILE_SECRET: "tsec",
			RESEND_API_KEY: "rk",
		});
		const res = await POST(ev);
		await expectProblem(res, 500, { title: "Internal error" });
	});
});

describe("POST /api/v1/auth/requestLink (rate limit and db binding)", () => {
	it("429 when email issue quota exceeded", async () => {
		vi.mocked(enforceEmailIssueQuota).mockImplementationOnce(async () => {
			throw problemFrom("RESOURCE_EXHAUSTED", {
				detail: "rate limit exceeded",
			});
		});
		const req = makeRequest("http://localhost/api/v1/auth/requestLink", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ email: "u@studenti.unitn.it" }),
		});
		const ev = assignEnv(makeEvent("ok", { req, appEnv: "dev" }), baseEnv);
		const res = await POST(ev);
		await expectProblem(res, 429, { title: "Rate limit exceeded" });
	});

	it("500 when DB binding missing", async () => {
		const req = makeRequest("http://localhost/api/v1/auth/requestLink", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ email: "u@studenti.unitn.it" }),
		});
		const ev = assignEnv(makeEvent("none", { req, appEnv: "dev" }), baseEnv);
		const res = await POST(ev);
		await expectProblem(res, 500, { title: "Internal error" });
	});
});
