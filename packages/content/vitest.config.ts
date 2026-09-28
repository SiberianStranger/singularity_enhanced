import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@singularity/core": fileURLToPath(new URL("../core/src/index.ts", import.meta.url)),
    },
  },
  test: {
    // Whole-catalog validation reads YAML twice in the reproducibility case.
    // Windows I/O time is not a gameplay performance assertion.
    testTimeout: 30_000,
    maxWorkers: 2,
    environment: "node",
    include: ["test/**/*.test.ts"],
  },
});
