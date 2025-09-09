export async function verifyTurnstile(
	response: string,
	secret: string,
): Promise<boolean> {
	const r = await fetch(
		"https://challenges.cloudflare.com/turnstile/v0/siteverify",
		{
			method: "POST",
			headers: { "content-type": "application/x-www-form-urlencoded" },
			body: new URLSearchParams({ secret, response }),
		},
	);
	const j: unknown = await r.json().catch(() => null);
	return (
		typeof j === "object" &&
		j !== null &&
		"success" in j &&
		Boolean((j as Record<string, unknown>).success)
	);
}
