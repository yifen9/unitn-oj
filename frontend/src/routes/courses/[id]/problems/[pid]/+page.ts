import { error } from "@sveltejs/kit";
import type { PageLoad } from "./$types";

type ProblemDetail = {
	problemId: string;
	courseId: string;
	title: string;
	description?: string | null;
};

export const load: PageLoad = async ({ fetch, params }) => {
	const { id, pid } = params;
	const res = await fetch(
		`/api/v1/courses/${encodeURIComponent(id)}/problems/${encodeURIComponent(pid)}`,
		{ credentials: "same-origin" },
	);
	const j = await res.json().catch(() => ({}));
	if (!res.ok || !j?.ok)
		throw error(res.status, j?.error?.message ?? "Failed to load problem");
	return { problem: j.data as ProblemDetail };
};
