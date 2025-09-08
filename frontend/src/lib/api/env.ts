import type { RequestEvent } from "@sveltejs/kit";

export interface Bindings {
	DB: D1Database | undefined;
	APP_ENV: string;
}

export function getBindings(event: RequestEvent): Bindings {
	const env = event.platform?.env;
	return Object.freeze({
		DB: env?.DB,
		APP_ENV: String(env?.APP_ENV ?? "unknown"),
	});
}

export function isProdFrom(bindings: Bindings): boolean {
	return bindings.APP_ENV.toLowerCase() === "prod";
}

export function getRequired(env: Record<string, unknown>, key: string): string {
	const v = String(env[key] ?? "");
	if (!v) throw new Error(`ENV ${key} is required`);
	return v;
}

export function getOptionalString(
	env: Record<string, unknown>,
	key: string,
	def = "",
): string {
	const v = env[key];
	return v == null ? def : String(v);
}

export function getOptionalNumber(
	env: Record<string, unknown>,
	key: string,
	def: number,
): number {
	const v = env[key];
	const n = Number(v);
	return Number.isFinite(n) ? n : def;
}
