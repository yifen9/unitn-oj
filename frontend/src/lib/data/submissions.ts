import { QueueSubmissionV1, SubmissionDto } from "../contracts/submissions";
import { SUBMISSION_SELECT } from "../sql/projections";

export type Env = { DB: D1Database; QUEUE: Queue } & Record<string, string>;

export async function listByUser(env: Env, userId: string) {
	const r = await env.DB.prepare(
		`SELECT ${SUBMISSION_SELECT} FROM submissions WHERE user_id=?1 ORDER BY created_at DESC`,
	)
		.bind(userId)
		.all<SubmissionDto>();
	return r.results?.map((x) => SubmissionDto.parse(x)) ?? [];
}

export async function getOwned(env: Env, submissionId: string) {
	const row = await env.DB.prepare(
		`SELECT ${SUBMISSION_SELECT} FROM submissions WHERE submission_id=?1`,
	)
		.bind(submissionId)
		.first<SubmissionDto>();
	return row ? SubmissionDto.parse(row) : null;
}

export async function createQueued(
	env: Env,
	p: {
		submissionId: string;
		userId: string;
		problemId: string;
		code: string;
		language?: string;
		timeLimitMs?: number;
		memoryLimitKb?: number;
		now: number;
	},
) {
	await env.DB.prepare(
		"INSERT INTO submissions (submission_id,user_id,problem_id,code,status,language,time_limit_ms,memory_limit_kb,created_at,updated_at) VALUES (?1,?2,?3,?4,'queued',?5,?6,?7,?8,?8)",
	)
		.bind(
			p.submissionId,
			p.userId,
			p.problemId,
			p.code,
			p.language ?? "cpp23",
			p.timeLimitMs ?? 2000,
			p.memoryLimitKb ?? 262144,
			p.now,
		)
		.run();

	const msg: QueueSubmissionV1 = {
		schema: "unitn-oj.submission.v1",
		submissionId: p.submissionId,
		userId: p.userId,
		problemId: p.problemId,
		language: (p.language ?? "cpp23") as any,
		codeRef: { kind: "inline" },
		timeLimitMs: p.timeLimitMs ?? 2000,
		memoryLimitKb: p.memoryLimitKb ?? 262144,
		createdAt: p.now,
	};
	QueueSubmissionV1.parse(msg);
	await env.QUEUE.send(msg);

	const row = await env.DB.prepare(
		`SELECT ${SUBMISSION_SELECT} FROM submissions WHERE submission_id=?1`,
	)
		.bind(p.submissionId)
		.first<SubmissionDto>();
	return row ? SubmissionDto.parse(row) : null;
}
