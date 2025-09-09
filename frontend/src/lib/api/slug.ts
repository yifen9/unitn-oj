export function slugifyEmailLocal(local: string) {
	const s = local
		.toLowerCase()
		.replace(/[^a-z0-9-]+/g, "-")
		.replace(/-+/g, "-")
		.replace(/^-+|-+$/g, "");
	return s || "u";
}
