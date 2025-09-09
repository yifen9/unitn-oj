import type { LayoutLoad } from "./$types";

type User = { id: string; email: string; slug: string };

export const load: LayoutLoad = async ({ fetch }) => {
	try {
		const r = await fetch("/api/v1/users/me", {
			credentials: "same-origin",
			headers: { accept: "application/json" },
		});
		if (!r.ok) return { user: null };
		const j = await r.json().catch(() => null);
		if (j?.ok) return { user: j.data as User };
		return { user: null };
	} catch {
		return { user: null };
	}
};
