export async function signSession(
	secret: string,
	email: string,
): Promise<string> {
	const enc = new TextEncoder();
	const key = await crypto.subtle.importKey(
		"raw",
		enc.encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const mac = await crypto.subtle.sign("HMAC", key, enc.encode(email));
	return `${b64url(email)}.${toHex(mac)}`;
}

export async function verifySession(
	secret: string,
	sid: string,
): Promise<string | null> {
	try {
		const [emailB64u, macHex] = sid.split(".");
		if (!emailB64u || !macHex) return null;
		const email = atob(emailB64u.replace(/-/g, "+").replace(/_/g, "/"));
		const enc = new TextEncoder();
		const key = await crypto.subtle.importKey(
			"raw",
			enc.encode(secret),
			{ name: "HMAC", hash: "SHA-256" },
			false,
			["sign"],
		);
		const mac = await crypto.subtle.sign("HMAC", key, enc.encode(email));
		return toHex(mac) === macHex ? email : null;
	} catch {
		return null;
	}
}

function b64url(s: string): string {
	return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function toHex(buf: ArrayBuffer): string {
	return [...new Uint8Array(buf)]
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}
