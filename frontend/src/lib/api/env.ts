import type { RequestEvent } from "@sveltejs/kit";

export function getBindings(event: RequestEvent) {
	const env = event.platform?.env;
	return {
		DB: env?.DB,
		APP_ENV: String(env?.APP_ENV ?? "unknown"),
	};
}

export function isProdFromBindings(bindings: { APP_ENV?: string }) {
	return String(bindings.APP_ENV ?? "").toLowerCase() === "prod";
}

export function getRequired(env: Record<string, unknown>, key: string) {
	const v = String(env[key] ?? "");
	if (!v) throw new Error(`ENV ${key} is required`);
	return v;
}

export function getOptionalString(
	env: Record<string, unknown>,
	key: string,
	def = "",
) {
	const v = env[key];
	return v == null ? def : String(v);
}

export function getOptionalNumber(
	env: Record<string, unknown>,
	key: string,
	def: number,
) {
	const v = env[key];
	const n = Number(v);
	return Number.isFinite(n) ? n : def;
}
