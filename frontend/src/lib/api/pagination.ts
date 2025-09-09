export function getLimit(u: URL, def = 20, max = 100): number {
	const n = Number(u.searchParams.get("limit"));
	if (!Number.isFinite(n)) return def;
	return Math.max(1, Math.min(max, Math.floor(n)));
}

export function getCursor(u: URL): string | null {
	const c = u.searchParams.get("cursor");
	return c ? String(c) : null;
}

export function encodeCursor(t: number, id: string): string {
	return btoa(JSON.stringify([t, id]));
}

export function decodeCursor(s: string): { t: number; id: string } | null {
	try {
		const [t, id] = JSON.parse(atob(s));
		const tn = Number(t);
		return Number.isFinite(tn) && typeof id === "string" ? { t: tn, id } : null;
	} catch {
		return null;
	}
}
