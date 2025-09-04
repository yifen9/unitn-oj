import { describe, expect, it, vi } from "vitest";
import { signSession } from "../src/lib/api/auth";
import * as mod from "../src/routes/api/v1/problems/[id]/submissions";
import { makeCtx, makeD1Mock } from "./helpers";

describe("POST /api/v1/problems/{id}/submissions", () => {
	it("201 inserts and sends queue", async () => {
		const { db } = makeD1Mock();
		const email = "alice@studenti.unitn.it";
		const sid = await signSession("dev-secret", email);

		const send = vi.fn(async () => {});
		const ctx = makeCtx({
			url: "http://x/api/v1/problems/hello/submissions",
			method: "POST",
			headers: {
				"content-type": "application/json",
				cookie: `sid=${sid}`,
			},
			body: JSON.stringify({ code: "print(1)" }),
			env: {
				APP_ENV: "dev",
				AUTH_SESSION_SECRET: "dev-secret",
				AUTH_ALLOWED_DOMAIN: "studenti.unitn.it",
				DB: db,
				QUEUE_SUBMISSIONS: { send },
			},
			params: { id: "hello" } as any,
		});

		const res = await (mod as any).onRequestPost(ctx);
		expect(res.status).toBe(201);
		const j = await res.json();
		expect(j.ok).toBe(true);
		expect(send).toHaveBeenCalledTimes(1);
	});
});
