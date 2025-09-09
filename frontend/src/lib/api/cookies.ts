export function buildSessionSetCookie(
	name: string,
	value: string,
	maxAge: number,
	secure: boolean,
) {
	const parts = [
		`${name}=${value}`,
		"HttpOnly",
		"Path=/",
		`Max-Age=${maxAge}`,
		"SameSite=Lax",
	];
	if (secure) parts.push("Secure");
	return parts.join("; ");
}

export function buildSessionClearCookie(name: string, secure: boolean) {
	const parts = [`${name}=`, "Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=0"];
	if (secure) parts.push("Secure");
	return parts.join("; ");
}

export function getCookie(req: Request, name: string): string | null {
	const raw = req.headers.get("cookie") ?? "";
	if (!raw) return null;
	for (const seg of raw.split(/;\s*/)) {
		const i = seg.indexOf("=");
		const k = i === -1 ? seg : seg.slice(0, i);
		if (k === name) return decodeURIComponent(i === -1 ? "" : seg.slice(i + 1));
	}
	return null;
}
