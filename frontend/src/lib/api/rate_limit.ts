import { problemFrom } from "$lib/api/http";

export async function enforceEmailIssueQuota(
	db: D1Database,
	email: string,
	windowS: number,
	limit: number,
) {
	const row = await db
		.prepare(
			"SELECT COUNT(*) AS c FROM tokens WHERE email=?1 AND purpose='login' AND created_at_s > unixepoch() - ?2",
		)
		.bind(email, windowS)
		.first<{ c: number }>();
	const c = Number(row?.c ?? 0);
	if (c >= limit)
		throw problemFrom("RESOURCE_EXHAUSTED", { detail: "rate limit exceeded" });
}

export async function enforceIpVerifyQuota(
	db: D1Database,
	ipHash: string,
	windowS: number,
	limit: number,
) {
	const row = await db
		.prepare(
			"SELECT COUNT(*) AS c FROM auth_logs WHERE ip_hash=?1 AND type='login_failure' AND created_at_s > unixepoch() - ?2",
		)
		.bind(ipHash, windowS)
		.first<{ c: number }>();
	const c = Number(row?.c ?? 0);
	if (c >= limit)
		throw problemFrom("RESOURCE_EXHAUSTED", { detail: "rate limit exceeded" });
}
