import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ platform }) => {
	const env = (platform?.env ?? {}) as Record<string, unknown>;
	const sitekey = String(env.TURNSTILE_SITE_KEY ?? "");
	return { sitekey };
};
