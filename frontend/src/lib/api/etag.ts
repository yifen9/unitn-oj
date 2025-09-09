export async function strongEtagOf(
	parts: Array<string | number>,
): Promise<string> {
	const data = parts.join("|");
	const enc = new TextEncoder().encode(data);
	const buf = await crypto.subtle.digest("SHA-256", enc);
	const hex = [...new Uint8Array(buf)]
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
	return `"${hex}"`;
}
