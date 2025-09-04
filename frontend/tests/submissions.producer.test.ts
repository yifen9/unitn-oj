import { describe, expect, it } from "bun:test";
import { signSession } from "../src/lib/api/auth";
import { POST } from "../src/routes/api/v1/problems/[id]/submissions/+server";
import { makeD1Mock, makeEvent } from "./helpers";

describe("POST /api/v1/problems/{id}/submissions", () => {
	it("201 inserts and sends queue", async () => {
		const { db } = makeD1Mock();
		const email = "alice@studenti.unitn.it";
		const sid = await signSession("dev-secret", email);

		const calls: any[] = [];
		const send = async (msg: any) => {
			calls.push(msg);
		};

		const event = makeEvent({
			url: "http://x/api/v1/problems/hello/submissions",
			method: "POST",
			headers: { "content-type": "application/json", cookie: `sid=${sid}` },
			body: JSON.stringify({ code: "print(1)" }),
			env: {
				APP_ENV: "dev",
				AUTH_SESSION_SECRET: "dev-secret",
				AUTH_ALLOWED_DOMAIN: "studenti.unitn.it",
				DB: db,
				QUEUE_SUBMISSIONS: { send },
			},
			params: { id: "hello" },
		});

		const res = await POST(event as any);
		expect(res.status).toBe(201);
		const j = await res.json();
		expect(j.ok).toBe(true);
		expect(calls.length).toBe(1);
	});
});
