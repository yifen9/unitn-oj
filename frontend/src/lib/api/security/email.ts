import { problemFrom } from "$lib/api/http";

export function normalizeEmail(s: string) {
	return String(s ?? "")
		.trim()
		.toLowerCase();
}

export function assertAllowedDomain(email: string, allowed: string) {
	if (!email || !email.endsWith(`@${allowed}`)) {
		throw problemFrom("INVALID_ARGUMENT", {
			detail: `email must end with @${allowed}`,
		});
	}
}
