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

export type ProblemRow = {
	id: string;
	course_id: string;
	slug: string;
	name: string | null;
	description: string | null;
	language_limit: string;
	code_size_limit_byte: number;
	time_limit_ms: number;
	memory_limit_byte: number;
	artifact: string | null;
	updated_at_s: number;
};

export async function getCourseIdBySlugs(
	db: D1Database,
	schoolSlug: string,
	courseSlug: string,
): Promise<string | null> {
	const row = await db
		.prepare(
			`SELECT c.id AS id
       FROM courses c
       JOIN schools s ON s.id = c.school_id
       WHERE s.slug=?1 AND c.slug=?2`,
		)
		.bind(schoolSlug, courseSlug)
		.first<{ id: string }>();
	return row?.id ?? null;
}

export async function getProblemBySlugs(
	db: D1Database,
	schoolSlug: string,
	courseSlug: string,
	problemSlug: string,
): Promise<ProblemRow | null> {
	const row = await db
		.prepare(
			`SELECT p.*
       FROM problems p
       JOIN courses c ON c.id = p.course_id
       JOIN schools s ON s.id = c.school_id
       WHERE s.slug=?1 AND c.slug=?2 AND p.slug=?3`,
		)
		.bind(schoolSlug, courseSlug, problemSlug)
		.first<ProblemRow>();
	return row ?? null;
}

export async function listProblemsByCourseSlugs(
	db: D1Database,
	schoolSlug: string,
	courseSlug: string,
	limit = 50,
): Promise<Array<Pick<ProblemRow, "id" | "slug" | "name" | "updated_at_s">>> {
	const rows = await db
		.prepare(
			`SELECT p.id, p.slug, p.name, p.updated_at_s
       FROM problems p
       JOIN courses c ON c.id = p.course_id
       JOIN schools s ON s.id = c.school_id
       WHERE s.slug=?1 AND c.slug=?2
       ORDER BY p.name ASC, p.id ASC
       LIMIT ?3`,
		)
		.bind(schoolSlug, courseSlug, Math.max(1, Math.min(100, limit)))
		.all<Pick<ProblemRow, "id" | "slug" | "name" | "updated_at_s">>();
	return rows.results ?? [];
}

export async function getProblemById(
	db: D1Database,
	id: string,
): Promise<ProblemRow | null> {
	const row = await db
		.prepare(`SELECT * FROM problems WHERE id=?1`)
		.bind(id)
		.first<ProblemRow>();
	return row ?? null;
}
