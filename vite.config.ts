import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		dir: "./test",
		globalSetup: "./test/globalSetup.ts",
	},
	plugins: [swc.vite()],
});
