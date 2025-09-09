import { verifySession } from "$lib/api/auth/session";
import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async ({ cookies, platform }) => {
	const sid = cookies.get("sid");
	let user: { email: string; slug: string } | null = null;

	const env = platform?.env as
		| { DB?: D1Database; AUTH_SESSION_SECRET?: string }
		| undefined;

	if (!sid || !env?.AUTH_SESSION_SECRET || !env?.DB) {
		return { loggedIn: false, user: null };
	}

	try {
		const email = await verifySession(env.AUTH_SESSION_SECRET, sid);
		if (email) {
			const row = await env.DB.prepare("SELECT slug FROM users WHERE email = ?")
				.bind(email)
				.first<{ slug: string }>();
			if (row) user = { email, slug: row.slug };
		}
	} catch {}

	return { loggedIn: Boolean(user), user };
};
