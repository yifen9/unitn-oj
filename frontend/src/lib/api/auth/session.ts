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
	const payload = `${email}.${Date.now()}`;
	const mac = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
	return `${b64u(enc.encode(payload))}.${b64u(mac)}`;
}

function b64u(data: BufferSource): string {
	let bytes: Uint8Array;
	if (data instanceof ArrayBuffer) {
		bytes = new Uint8Array(data);
	} else {
		const view = data as ArrayBufferView;
		bytes = new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
	}
	let bin = "";
	for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
	return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export async function verifySession(
	secret: string,
	sid: string,
): Promise<string | null> {
	try {
		const enc = new TextEncoder();
		const [emailEnc, macHex] = sid.split(".");
		if (!emailEnc || !macHex) return null;
		const email = decodeURIComponent(atob(emailEnc));
		const key = await crypto.subtle.importKey(
			"raw",
			enc.encode(secret),
			{ name: "HMAC", hash: "SHA-256" },
			false,
			["sign"],
		);
		const sig = await crypto.subtle.sign("HMAC", key, enc.encode(email));
		const calc = [...new Uint8Array(sig)]
			.map((b) => b.toString(16).padStart(2, "0"))
			.join("");
		if (calc !== macHex) return null;
		return email;
	} catch {
		return null;
	}
}
