import { randomHex } from "$lib/api/crypto/random";
import { problemFrom } from "$lib/api/http";
import { slugifyEmailLocal } from "$lib/api/slug";

export async function ensureUserActive(db: D1Database, email: string) {
	const ex = await db
		.prepare("SELECT id, slug FROM users WHERE email=?1")
		.bind(email)
		.first<{ id: string; slug: string }>();
	if (ex) {
		await db
			.prepare("UPDATE users SET is_active=1 WHERE id=?1")
			.bind(ex.id)
			.run();
		return { id: ex.id, slug: ex.slug };
	}
	const id = crypto.randomUUID();
	const base = slugifyEmailLocal(email.split("@")[0]).slice(0, 64);
	for (let i = 0; i < 5; i++) {
		const candidate = (i === 0 ? base : `${base}-${randomHex(3)}`).slice(0, 64);
		try {
			await db
				.prepare(
					"INSERT INTO users(id,email,slug,is_active) VALUES(?1,?2,?3,1)",
				)
				.bind(id, email, candidate)
				.run();
			return { id, slug: candidate };
		} catch {}
	}
	throw problemFrom("INTERNAL", { detail: "user slug allocation failed" });
}
