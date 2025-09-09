export type SchoolRow = {
	id: string;
	slug: string;
	name: string | null;
	description: string | null;
	updated_at_s: number;
};

export async function listSchools(
	db: D1Database,
	limit = 50,
): Promise<Array<Pick<SchoolRow, "id" | "slug" | "name" | "updated_at_s">>> {
	const rows = await db
		.prepare(
			`SELECT id, slug, name, updated_at_s
       FROM schools
       ORDER BY name ASC, id ASC
       LIMIT ?1`,
		)
		.bind(Math.max(1, Math.min(100, limit)))
		.all<Pick<SchoolRow, "id" | "slug" | "name" | "updated_at_s">>();
	return rows.results ?? [];
}

export async function getSchoolBySlug(
	db: D1Database,
	slug: string,
): Promise<SchoolRow | null> {
	const row = await db
		.prepare(`SELECT * FROM schools WHERE slug=?1`)
		.bind(slug)
		.first<SchoolRow>();
	return row ?? null;
}
