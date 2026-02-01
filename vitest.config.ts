import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		dir: "./test",
		globalSetup: "./test/globalSetup.ts",
		setupFiles: "./test/testSetup.ts",
		testTimeout: 10_000,
		reporters: process.env.GITHUB_ACTIONS
			? ["dot", "github-actions"]
			: ["dot"],
	},
	plugins: [swc.vite()],
});
