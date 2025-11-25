import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  root: resolve(__dirname),
  css: {
    postcss: {},
  },
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/setup.ts"],
    testTimeout: 10000,
  },
});
