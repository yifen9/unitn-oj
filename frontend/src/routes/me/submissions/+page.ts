import { error } from "@sveltejs/kit";
import type { SubmissionDto } from "../../../lib/contracts/submissions";
import type { PageLoad } from "./$types";
export const load: PageLoad = async ({ fetch }) => {
	const res = await fetch("/api/v1/users/me/submissions", {
		credentials: "same-origin",
	});
	const j = await res.json().catch(() => ({}));
	if (res.status === 401)
		return { requiresAuth: true, submissions: [] as SubmissionDto[] };
	if (!res.ok || !j?.ok)
		throw error(res.status, j?.error?.message ?? "Failed to load submissions");
	return { requiresAuth: false, submissions: j.data as SubmissionDto[] };
};
