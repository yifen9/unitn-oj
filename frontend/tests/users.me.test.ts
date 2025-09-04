import { describe, expect, it } from "vitest";
import { signSession } from "../src/lib/api/auth";
import { GET } from "../src/routes/api/v1/users/me/+server";
import { makeD1Mock, makeEvent, readJson } from "./helpers";

const DEV = {
	APP_ENV: "dev",
	AUTH_SESSION_TTL_SECONDS: "3600",
	AUTH_SESSION_SECRET: "dev-secret",
};
const PROD = {
	APP_ENV: "production",
	AUTH_SESSION_TTL_SECONDS: "3600",
	AUTH_SESSION_SECRET: "prod-secret",
};

describe("GET /api/v1/users/me", () => {
	it("401 when sid cookie missing", async () => {
		const { db } = makeD1Mock();
		const e = makeEvent({
			url: "http://x/api/v1/users/me",
			env: { ...DEV, DB: db },
		});
		const res = await GET(e as any);
		expect(res.status).toBe(401);
		const j = await readJson(res);
		expect(j.ok).toBe(false);
		expect(j.error.code).toBe("UNAUTHENTICATED");
	});

	it("401 when sid invalid", async () => {
		const { db } = makeD1Mock();
		const e = makeEvent({
			url: "http://x/api/v1/users/me",
			headers: { cookie: "sid=bad.sid.token" },
			env: { ...DEV, DB: db },
		});
		const res = await GET(e as any);
		expect(res.status).toBe(401);
	});

	it("200 when session valid and user exists", async () => {
		const { db, state } = makeD1Mock();
		const email = "alice@studenti.unitn.it";
		const sid = await signSession(DEV.AUTH_SESSION_SECRET, email);
		state.firstResult = { userId: "u_12345678", email, createdAt: 1234567890 };

		const orig = (db as any).prepare.bind(db);
		(db as any).prepare = (sql: string) => {
			const s = orig(sql);
			if (/SELECT\s+user_id/i.test(sql)) {
				s.first = async <T>() => state.firstResult as T;
			}
			return s;
		};

		const e = makeEvent({
			url: "http://x/api/v1/users/me",
			headers: { cookie: `sid=${sid}` },
			env: { ...DEV, DB: db },
		});

		const res = await GET(e as any);
		expect(res.status).toBe(200);
		const j = await readJson(res);
		expect(j.ok).toBe(true);
		expect(j.data.email).toBe(email);
		expect(j.data.userId).toMatch(/^u_/);
		expect(typeof j.data.createdAt).toBe("number");
	});

	it("401 when user not found", async () => {
		const { db } = makeD1Mock();
		const sid = await signSession(
			DEV.AUTH_SESSION_SECRET,
			"ghost@studenti.unitn.it",
		);
		const e = makeEvent({
			url: "http://x/api/v1/users/me",
			headers: { cookie: `sid=${sid}` },
			env: { ...DEV, DB: db },
		});
		const res = await GET(e as any);
		expect(res.status).toBe(401);
	});

	it("500 INTERNAL when DB throws in prod", async () => {
		const { db } = makeD1Mock();
		const sid = await signSession(
			PROD.AUTH_SESSION_SECRET,
			"alice@studenti.unitn.it",
		);
		(db as any).prepare = () => ({
			bind: () => ({
				first: async () => {
					throw new Error("boom");
				},
			}),
		});

		const e = makeEvent({
			url: "http://x/api/v1/users/me",
			headers: { cookie: `sid=${sid}` },
			env: { ...PROD, DB: db },
		});

		const res = await GET(e as any);
		expect(res.status).toBe(500);
	});
});
