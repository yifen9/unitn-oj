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
