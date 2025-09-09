function toHex(u8: Uint8Array) {
	return [...u8].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function hmacHex(secret: string, value: string) {
	const enc = new TextEncoder();
	const key = await crypto.subtle.importKey(
		"raw",
		enc.encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const sig = await crypto.subtle.sign("HMAC", key, enc.encode(value));
	return toHex(new Uint8Array(sig));
}
