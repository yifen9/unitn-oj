import { decodeCursor, encodeCursor } from "$lib/api/pagination";

export type SubmissionRow = {
	id: string;
	user_id: string;
	problem_id: string;
	status: string;
	language: string;
	code: string;
	code_size_byte: number;
	run_time_ms: number | null;
	run_memory_byte: number | null;
	artifact: string | null;
	created_at_s: number;
	updated_at_s: number;
};

function randomHex(n: number) {
	return [...crypto.getRandomValues(new Uint8Array(n))]
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

export async function listSubmissionsByProblem(
	db: D1Database,
	problemId: string,
	limit: number,
	cursor: string | null,
): Promise<{ items: SubmissionRow[]; nextCursor: string | null }> {
	let sql =
		"SELECT id,user_id,problem_id,status,language,code,code_size_byte,run_time_ms,run_memory_byte,artifact,created_at_s,updated_at_s FROM submissions WHERE problem_id=?1";
	const args: unknown[] = [problemId];
	const ck = cursor ? decodeCursor(cursor) : null;
	if (ck) {
		sql += " AND (created_at_s < ?2 OR (created_at_s = ?2 AND id < ?3))";
		args.push(ck.t, ck.id);
	}
	sql += " ORDER BY created_at_s DESC, id DESC LIMIT ?4";
	args.push(limit + 1);
	const rows = await db
		.prepare(sql)
		.bind(...args)
		.all<SubmissionRow>();
	const list = rows.results ?? [];
	const hasMore = list.length > limit;
	const items = hasMore ? list.slice(0, limit) : list;
	const last = items[items.length - 1];
	const nextCursor =
		hasMore && last ? encodeCursor(last.created_at_s, last.id) : null;
	return { items, nextCursor };
}

export async function listSubmissionsByUserId(
	db: D1Database,
	userId: string,
	limit: number,
	cursor: string | null,
): Promise<{ items: SubmissionRow[]; nextCursor: string | null }> {
	let sql =
		"SELECT id,user_id,problem_id,status,language,code,code_size_byte,run_time_ms,run_memory_byte,artifact,created_at_s,updated_at_s FROM submissions WHERE user_id=?1";
	const args: unknown[] = [userId];
	const ck = cursor ? decodeCursor(cursor) : null;
	if (ck) {
		sql += " AND (created_at_s < ?2 OR (created_at_s = ?2 AND id < ?3))";
		args.push(ck.t, ck.id);
	}
	sql += " ORDER BY created_at_s DESC, id DESC LIMIT ?4";
	args.push(limit + 1);
	const rows = await db
		.prepare(sql)
		.bind(...args)
		.all<SubmissionRow>();
	const list = rows.results ?? [];
	const hasMore = list.length > limit;
	const items = hasMore ? list.slice(0, limit) : list;
	const last = items[items.length - 1];
	const nextCursor =
		hasMore && last ? encodeCursor(last.created_at_s, last.id) : null;
	return { items, nextCursor };
}

export async function createSubmission(
	db: D1Database,
	args: {
		user_id: string;
		problem_id: string;
		language: string;
		code: string;
		code_size_byte: number;
	},
): Promise<SubmissionRow> {
	const id = `sb_${randomHex(16)}`;
	await db
		.prepare(
			"INSERT INTO submissions (id,user_id,problem_id,status,language,code,code_size_byte) VALUES (?1,?2,?3,'IQ',?4,?5,?6)",
		)
		.bind(
			id,
			args.user_id,
			args.problem_id,
			args.language,
			args.code,
			args.code_size_byte,
		)
		.run();
	const row = await db
		.prepare(
			"SELECT id,user_id,problem_id,status,language,code,code_size_byte,run_time_ms,run_memory_byte,artifact,created_at_s,updated_at_s FROM submissions WHERE id=?1",
		)
		.bind(id)
		.first<SubmissionRow>();
	if (!row) throw new Error("insert failed");
	return row;
}

export async function getSubmissionById(
	db: D1Database,
	id: string,
): Promise<SubmissionRow | null> {
	const row = await db
		.prepare(
			"SELECT id,user_id,problem_id,status,language,code,code_size_byte,run_time_ms,run_memory_byte,artifact,created_at_s,updated_at_s FROM submissions WHERE id=?1",
		)
		.bind(id)
		.first<SubmissionRow>();
	return row ?? null;
}
