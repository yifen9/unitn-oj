import { describe, expect, it } from "vitest";
import {
	type EventRouteId,
	eventFactoryForEvent,
	expectTraceparentEcho,
	jsonOf,
	makeRequest,
} from "./helper";

const { POST } = await import("../../src/routes/api/v1/auth/logout/+server");

type Ev = Parameters<typeof POST>[0];
type RId = EventRouteId<Ev>;
const makeEvent = eventFactoryForEvent<Ev>("/api/v1/auth/logout" as RId);

describe("POST /api/v1/auth/logout (html client)", () => {
	it("303 redirect and clears cookie", async () => {
		const req = makeRequest("http://localhost/api/v1/auth/logout", {
			method: "POST",
			headers: {
				accept: "text/html",
				traceparent: "00-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-bbbbbbbbbbbbbbbb-01",
			},
		});
		const ev = makeEvent("ok", { req, appEnv: "dev" });
		const res = await POST(ev);
		expect(res.status).toBe(303);
		expect(res.headers.get("location")).toBe("/");
		const sc = res.headers.get("set-cookie") ?? "";
		expect(sc).toMatch(/^sid=/);
		expect(sc).toMatch(/Max-Age=0/);
		expect(sc).toMatch(/HttpOnly/);
		expect(sc).toMatch(/SameSite=Lax/);
		expectTraceparentEcho(res, req);
	});
});

describe("POST /api/v1/auth/logout (json client)", () => {
	it("200 ok and clears cookie", async () => {
		const req = makeRequest("http://localhost/api/v1/auth/logout", {
			method: "POST",
		});
		const ev = makeEvent("ok", { req, appEnv: "dev" });
		const res = await POST(ev);
		expect(res.status).toBe(200);
		const body = await jsonOf<{ ok: true }>(res);
		expect(body.ok).toBe(true);
		const sc = res.headers.get("set-cookie") ?? "";
		expect(sc).toMatch(/^sid=/);
		expect(sc).toMatch(/Max-Age=0/);
		expect(sc).toMatch(/HttpOnly/);
		expect(sc).toMatch(/SameSite=Lax/);
	});
});

describe("POST /api/v1/auth/logout (prod cookie secure)", () => {
	it("sets Secure attribute", async () => {
		const req = makeRequest("http://localhost/api/v1/auth/logout", {
			method: "POST",
		});
		const ev = makeEvent("ok", { req, appEnv: "prod" });
		const res = await POST(ev);
		const sc = res.headers.get("set-cookie") ?? "";
		expect(sc).toMatch(/Secure/);
	});
});
