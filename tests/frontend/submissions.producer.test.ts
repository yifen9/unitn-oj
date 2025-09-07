import { describe, expect, it } from "vitest";
import { signSession } from "../../frontend/src/lib/api/auth";
import { POST } from "../../frontend/src/routes/api/v1/problems/[id]/submissions/+server";
import { makeD1Mock, makeEvent } from "./helpers";

describe("POST /api/v1/problems/{id}/submissions producer", () => {
	it("201 inserts and sends queue", async () => {
		const { db, state } = makeD1Mock();
		const sid = await signSession("dev-secret", "alice@studenti.unitn.it");
		const calls: any[] = [];
		const orig = (db as any).prepare.bind(db);
		(db as any).prepare = (sql: string) => {
			const s = orig(sql);
			if (/INSERT\s+INTO\s+submissions/i.test(sql)) {
				const run = s.run.bind(s);
				s.run = async () => {
					(state as any).insertArgs = [...state.lastArgs];
					return run();
				};
			}
			if (
				/SELECT\s+.+\s+FROM\s+submissions\s+WHERE\s+submission_id/i.test(sql)
			) {
				s.first = async () => {
					const a = (state as any).insertArgs || [];
					const submissionId = a[0];
					const userId = a[1];
					const problemId = a[2];
					const createdAt = a[5];
					return {
						submissionId,
						userId,
						problemId,
						status: "queued",
						createdAt,
					};
				};
			}
			return s;
		};
		const e = makeEvent({
			url: "http://x/api/v1/problems/hello/submissions",
			method: "POST",
			headers: { "content-type": "application/json", cookie: `sid=${sid}` },
			body: JSON.stringify({ code: "print(1)" }),
			env: {
				APP_ENV: "dev",
				AUTH_SESSION_SECRET: "dev-secret",
				AUTH_ALLOWED_DOMAIN: "studenti.unitn.it",
				DB: db,
				QUEUE: { send: async (m: any) => calls.push(m) },
			},
			params: { id: "hello" },
		});
		const res = await POST(e as any);
		expect(res.status).toBe(201);
		expect(calls.length).toBe(1);
		expect(calls[0]?.problemId).toBe("hello");
	});
});
