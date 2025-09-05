import { describe, expect, it } from "vitest";
import { POST } from "../../frontend/src/routes/api/v1/auth/requestLink/+server";
import { makeD1Mock, makeEvent, readJson } from "./helpers";

const DEV = {
	APP_ENV: "dev",
	AUTH_ALLOWED_DOMAIN: "studenti.unitn.it",
	AUTH_TOKEN_TTL_SECONDS: "300",
	AUTH_SESSION_SECRET: "dev-secret",
};
const PROD = {
	APP_ENV: "prod",
	AUTH_ALLOWED_DOMAIN: "studenti.unitn.it",
	AUTH_TOKEN_TTL_SECONDS: "300",
	AUTH_SESSION_SECRET: "prod-secret",
};

describe("POST /api/v1/auth/requestLink", () => {
	it("500 INTERNAL on D1 insert error in prod", async () => {
		const { db } = makeD1Mock();

		(db as any).prepare = () => ({
			bind: () => ({
				run: async () => {
					throw new Error("D1 insert failed");
				},
			}),
		});

		const e = makeEvent({
			url: "https://oj.example.com/api/v1/auth/requestLink",
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ email: "alice@studenti.unitn.it" }),
			env: {
				APP_ENV: "prod",
				AUTH_ALLOWED_DOMAIN: "studenti.unitn.it",
				AUTH_TOKEN_TTL_SECONDS: "300",
				AUTH_SESSION_SECRET: "prod-secret",
				DB: db,
			},
		});

		const res = await POST(e as any);
		expect(res.status).toBe(500);
		const j = await res.json();
		expect(j.ok).toBe(false);
		expect(j.error.code).toBe("INTERNAL");
	});

	it("dev tolerates D1 insert error (still 200)", async () => {
		const { db } = makeD1Mock();

		(db as any).prepare = () => ({
			bind: () => ({
				run: async () => {
					throw new Error("D1 insert failed");
				},
			}),
		});

		const e = makeEvent({
			url: "http://local/api/v1/auth/requestLink",
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ email: "alice@studenti.unitn.it" }),
			env: {
				APP_ENV: "dev",
				AUTH_ALLOWED_DOMAIN: "studenti.unitn.it",
				AUTH_TOKEN_TTL_SECONDS: "300",
				AUTH_SESSION_SECRET: "dev-secret",
				DB: db,
			},
		});

		const res = await POST(e as any);
		expect(res.status).toBe(200);
		const j = await res.json();
		expect(j.ok).toBe(true);
	});
});
