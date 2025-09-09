export type CourseRow = {
	id: string;
	school_id: string;
	slug: string;
	name: string | null;
	description: string | null;
	updated_at_s: number;
};

export async function listCoursesBySchoolSlug(
	db: D1Database,
	schoolSlug: string,
	limit = 50,
): Promise<Array<Pick<CourseRow, "id" | "slug" | "name" | "updated_at_s">>> {
	const rows = await db
		.prepare(
			`SELECT c.id, c.slug, c.name, c.updated_at_s
       FROM courses c
       JOIN schools s ON s.id=c.school_id
       WHERE s.slug=?1
       ORDER BY c.name ASC, c.id ASC
       LIMIT ?2`,
		)
		.bind(schoolSlug, Math.max(1, Math.min(100, limit)))
		.all<Pick<CourseRow, "id" | "slug" | "name" | "updated_at_s">>();
	return rows.results ?? [];
}

export async function getCourseBySlugs(
	db: D1Database,
	schoolSlug: string,
	courseSlug: string,
): Promise<CourseRow | null> {
	const row = await db
		.prepare(
			`SELECT c.*
       FROM courses c
       JOIN schools s ON s.id=c.school_id
       WHERE s.slug=?1 AND c.slug=?2`,
		)
		.bind(schoolSlug, courseSlug)
		.first<CourseRow>();
	return row ?? null;
}
