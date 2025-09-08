import { describe, expect, it } from "vitest";
import { GET, HEAD } from "../../src/routes/api/health/+server";
import {
	type EventRouteId,
	eventFactoryForEvent,
	expectProblem,
	expectTraceparentEcho,
	jsonOf,
	makeRequest,
} from "./helper";

type HealthEvent = Parameters<typeof GET>[0];
type HealthRouteId = EventRouteId<HealthEvent>;

const makeHealthEvent = eventFactoryForEvent<HealthEvent>(
	"/api/health" as HealthRouteId,
);

interface HealthBody {
	status: "ok";
	checks: { db: "ok" | "skipped" };
	env: string;
	now: string;
}

describe("GET /api/health (db ok)", () => {
	it("returns 200 with JSON body, no-store, db:ok, env and now", async () => {
		const req = makeRequest();
		const event: HealthEvent = makeHealthEvent("ok", { req, appEnv: "prod" });
		const res = await GET(event);
		expect(res.status).toBe(200);
		expect(res.headers.get("cache-control")).toMatch(/no-store/i);
		expect(res.headers.get("content-type")).toMatch(/application\/json/i);
		const body = await jsonOf<HealthBody>(res);
		expect(body.status).toBe("ok");
		expect(body.checks.db).toBe("ok");
		expect(body.env).toBe("prod");
		expect(new Date(body.now).toString()).not.toBe("Invalid Date");
		expectTraceparentEcho(res, req);
	});
});

describe("GET /api/health (db skipped)", () => {
	it("returns 200 with db:skipped when no DB binding", async () => {
		const req = makeRequest();
		const event: HealthEvent = makeHealthEvent("none", { req });
		const res = await GET(event);
		expect(res.status).toBe(200);
		const body = await jsonOf<HealthBody>(res);
		expect(body.checks.db).toBe("skipped");
		expectTraceparentEcho(res, req);
	});
});

describe("GET /api/health (db error)", () => {
	it("returns 503 problem+json on DB failure", async () => {
		const req = makeRequest();
		const event: HealthEvent = makeHealthEvent("error", { req });
		const res = await GET(event);
		await expectProblem(res, 503, {
			title: "Service Unavailable",
			detailIncludes: "database",
		});
		expectTraceparentEcho(res, req);
	});
});

describe("GET /api/health (not acceptable)", () => {
	it("returns 406 when Accept excludes application/json", async () => {
		const req = makeRequest("http://localhost/api/health", {
			headers: { accept: "text/html" },
		});
		const event: HealthEvent = makeHealthEvent("ok", { req });
		const res = await GET(event);
		await expectProblem(res, 406, { title: "Not Acceptable" });
		expectTraceparentEcho(res, req);
	});
});

describe("HEAD /api/health (db ok)", () => {
	it("returns 200 with no body and no-store", async () => {
		const req = makeRequest("http://localhost/api/health", { method: "HEAD" });
		const event: HealthEvent = makeHealthEvent("ok", { req });
		const res = await HEAD(event);
		expect(res.status).toBe(200);
		expect(res.headers.get("cache-control")).toMatch(/no-store/i);
		const txt = await res.text();
		expect(txt).toBe("");
		expectTraceparentEcho(res, req);
	});
});

describe("HEAD /api/health (db error)", () => {
	it("returns 503 with no body", async () => {
		const req = makeRequest("http://localhost/api/health", { method: "HEAD" });
		const event: HealthEvent = makeHealthEvent("error", { req });
		const res = await HEAD(event);
		expect(res.status).toBe(503);
		const txt = await res.text();
		expect(txt).toBe("");
		expectTraceparentEcho(res, req);
	});
});

describe("traceparent propagation", () => {
	it("echoes provided traceparent header", async () => {
		const trace = "00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01";
		const req = makeRequest("http://localhost/api/health", {
			headers: { accept: "application/json", traceparent: trace },
		});
		const event: HealthEvent = makeHealthEvent("ok", { req });
		const res = await GET(event);
		expect(res.headers.get("traceparent")).toBe(trace);
	});
});
