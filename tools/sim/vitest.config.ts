import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // The balance tests play whole runs of the shipped content; the M2 world system made a
    // two-origin sweep take five to seven seconds on the macOS and Windows runners, past the
    // five-second default.
    testTimeout: 120_000,
    environment: "node",
    include: ["test/**/*.test.ts"],
  },
});
