export function randomHex(n = 32) {
	const bytes = new Uint8Array(n);
	crypto.getRandomValues(bytes);
	return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}
