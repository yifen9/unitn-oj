import path from "node:path";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
	root: __dirname,
	plugins: [sveltekit()],
	resolve: {
		alias: {
			$lib: path.resolve(__dirname, "src/lib"),
			$app: path.resolve(__dirname, ".svelte-kit/generated/app"),
		},
	},
	test: {
		environment: "node",
		globals: true,
		include: ["tests/api/**/*.test.{ts,js}"],
	},
});
