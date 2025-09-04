import { error } from "@sveltejs/kit";
import type { PageLoad } from "./$types";

type Problem = { problemId: string; title: string };

export const load: PageLoad = async ({ fetch, params }) => {
	const { id } = params;
	const res = await fetch(
		`/api/v1/courses/${encodeURIComponent(id)}/problems`,
		{ credentials: "same-origin" },
	);
	const j = await res.json().catch(() => ({}));
	if (!res.ok || !j?.ok)
		throw error(res.status, j?.error?.message ?? "Failed to load problems");
	return { courseId: id, problems: j.data as Problem[] };
};
