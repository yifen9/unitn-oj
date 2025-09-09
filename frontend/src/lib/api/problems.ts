export type ProblemLimits = {
	id: string;
	code_size_limit_byte: number;
	time_limit_ms: number;
	memory_limit_byte: number;
	language_limit: string[] | unknown;
};

export async function getProblemLimits(
	db: D1Database,
	problemId: string,
): Promise<ProblemLimits | null> {
	const row = await db
		.prepare(
			"SELECT id, code_size_limit_byte, time_limit_ms, memory_limit_byte, language_limit FROM problems WHERE id=?1",
		)
		.bind(problemId)
		.first<{
			id: string;
			code_size_limit_byte: number;
			time_limit_ms: number;
			memory_limit_byte: number;
			language_limit: string;
		}>();
	if (!row) return null;
	let lang: unknown = [];
	try {
		lang = JSON.parse(row.language_limit ?? "[]");
	} catch {}
	return {
		id: row.id,
		code_size_limit_byte: row.code_size_limit_byte,
		time_limit_ms: row.time_limit_ms,
		memory_limit_byte: row.memory_limit_byte,
		language_limit: Array.isArray(lang) ? (lang as string[]) : [],
	};
}
