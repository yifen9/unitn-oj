import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const ENV = process.argv[2];
if (!ENV || !["dev", "prod"].includes(ENV)) {
	console.error("Usage: node scripts/update-d1-id.mjs <dev|prod>");
	process.exit(1);
}

const TF_DIR = resolve("infra/terraform");
const WRANGLER_PATH = resolve(`deploy/cloudflare/${ENV}/wrangler.jsonc`);

function sh(cmd, opts = {}) {
	return execSync(cmd, { stdio: ["pipe", "pipe", "inherit"], ...opts })
		.toString()
		.trim();
}

try {
	sh(`terraform -chdir=${TF_DIR} workspace select ${ENV}`);

	const d1Id = sh(`terraform -chdir=${TF_DIR} output -raw d1_db_id`);
	if (!d1Id || !/^[0-9a-f-]{36}$/i.test(d1Id)) {
		throw new Error(`Invalid d1_db_id: "${d1Id}"`);
	}

	const src = readFileSync(WRANGLER_PATH, "utf8");
	const updated = src.replace(
		/("database_id"\s*:\s*")[^"]*(")/g,
		`$1${d1Id}$2`,
	);

	const ts = new Date().toISOString().replace(/[:.]/g, "-");
	const backupDir = join(tmpdir(), "unitn-oj", ENV);
	if (!existsSync(backupDir)) mkdirSync(backupDir, { recursive: true });
	const backupPath = join(backupDir, `wrangler.jsonc.bak.${ts}`);

	writeFileSync(backupPath, src, "utf8");
	writeFileSync(WRANGLER_PATH, updated, "utf8");

	console.log(`[ok] Updated D1 database_id in ${WRANGLER_PATH}`);
	console.log(`[ok] Current d1_db_id: ${d1Id}`);
	console.log(`[bak] Backup at: ${backupPath}`);
} catch (e) {
	console.error(`[fail] ${e.message}`);
	process.exit(1);
}
