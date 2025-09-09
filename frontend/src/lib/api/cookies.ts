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
