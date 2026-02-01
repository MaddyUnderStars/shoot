import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		dir: "./test",
		globalSetup: "./test/globalSetup.ts",
		setupFiles: "./test/testSetup.ts",
		testTimeout: 10_000,
		reporters: process.env.GITHUB_ACTIONS
			? ["default", "github-actions"]
			: ["dot"],
		retry: process.env.GITHUB_ACTIONS ? 1 : 0,
	},
	plugins: [swc.vite()],
});
