import { randomHex } from "$lib/api/crypto/random";
import { problemFrom } from "$lib/api/http";
import { slugifyEmailLocal } from "$lib/api/slug";

export type UserRow = {
	id: string;
	email: string;
	slug: string;
	name: string | null;
	description: string | null;
	is_active: number | boolean;
};

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

export async function getUserByEmail(
	db: D1Database,
	email: string,
): Promise<UserRow | null> {
	const row = await db
		.prepare(
			"SELECT id,email,slug,name,description,is_active FROM users WHERE email=?1",
		)
		.bind(email)
		.first<UserRow>();
	return row ?? null;
}

export type PublicUserRow = {
	id: string;
	slug: string;
	name: string | null;
	description: string | null;
	updated_at_s: number;
	is_active: number | boolean;
};

export async function getPublicUserBySlug(
	db: D1Database,
	slug: string,
): Promise<PublicUserRow | null> {
	const row = await db
		.prepare(
			"SELECT id,slug,name,description,updated_at_s,is_active FROM users WHERE slug=?1 AND is_active=1",
		)
		.bind(slug)
		.first<PublicUserRow>();
	return row ?? null;
}
