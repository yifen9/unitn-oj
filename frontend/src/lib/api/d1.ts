import { problemFrom } from "$lib/api/http";

export function assertDb(db: D1Database | undefined): asserts db is D1Database {
	if (!db)
		throw problemFrom("INTERNAL", { detail: "database binding missing" });
}
