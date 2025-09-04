export async function signSession(
	secret: string,
	email: string,
	issuedAtSec?: number,
) {
	const ts = issuedAtSec ?? Math.floor(Date.now() / 1000);
	const payload = `${email}.${ts}`;
	const key = await crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const mac = await crypto.subtle.sign(
		"HMAC",
		key,
		new TextEncoder().encode(payload),
	);
	const b64 = btoa(String.fromCharCode(...new Uint8Array(mac)))
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/, "");
	return `${payload}.${b64}`;
}

export async function verifySession(
	secret: string,
	sid: string,
	maxAgeSec: number,
) {
	const p = sid.lastIndexOf(".");
	if (p <= 0) throw new Error("bad sid format");
	const payload = sid.slice(0, p);
	const _sig = sid.slice(p + 1);
	const q = payload.lastIndexOf(".");
	if (q <= 0) throw new Error("bad sid payload");
	const email = payload.slice(0, q);
	const tsStr = payload.slice(q + 1);
	const ts = Number(tsStr);
	if (!email || !Number.isFinite(ts)) throw new Error("bad sid payload");
	const expected = await signSession(secret, email, ts);
	if (!timingSafeEqual(sid, expected)) throw new Error("bad sid signature");
	const now = Math.floor(Date.now() / 1000);
	if (ts + maxAgeSec < now) throw new Error("sid expired");
	return { email: email.toLowerCase(), iat: ts };
}

function timingSafeEqual(a: string, b: string) {
	if (a.length !== b.length) return false;
	let res = 0;
	for (let i = 0; i < a.length; i++) res |= a.charCodeAt(i) ^ b.charCodeAt(i);
	return res === 0;
}

export async function userIdFromEmail(email: string) {
	const buf = await crypto.subtle.digest(
		"SHA-256",
		new TextEncoder().encode(email.toLowerCase()),
	);
	return (
		"u_" +
		[...new Uint8Array(buf)]
			.slice(0, 8)
			.map((b) => b.toString(16).padStart(2, "0"))
			.join("")
	);
}

export function readSidFromCookie(req: Request): string | null {
	const cookie = req.headers.get("cookie") || "";
	const m = /(?:^|;\s*)sid=([^;]+)/i.exec(cookie);
	return m ? decodeURIComponent(m[1]) : null;
}
