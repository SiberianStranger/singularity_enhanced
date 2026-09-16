/**
 * Browser smoke test configuration.
 *
 * The suite runs against the production bundle served by `vite preview`, not the dev server, so it
 * exercises what CI deploys: the worker chunk, the compiled content bundle and the real core.
 *
 * Browsers are pre-installed in the image at `PLAYWRIGHT_BROWSERS_PATH`; this project never runs
 * `playwright install`. When the pinned Playwright cannot find a browser under that path (a
 * revision mismatch), `PLAYWRIGHT_CHROMIUM_PATH` points it at the binary directly.
 */

import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PLAYWRIGHT_PORT ?? 4173);
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH;

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./e2e/.results",
  // A game is a clock: the smoke test waits on game weeks, not on a single request.
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  forbidOnly: process.env.CI !== undefined,
  retries: process.env.CI === undefined ? 0 : 1,
  // Both artifact folders start with a dot, which the repository's `.gitignore` already covers.
  reporter:
    process.env.CI === undefined
      ? "list"
      : [["list"], ["html", { open: "never", outputFolder: "./e2e/.report" }]],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "retain-on-failure",
    video: "off",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
        launchOptions: {
          // The sandbox needs user namespaces, which container images usually do not grant.
          args: ["--no-sandbox", "--disable-dev-shm-usage"],
          ...(executablePath === undefined ? {} : { executablePath }),
        },
      },
    },
  ],
  webServer: {
    command: `pnpm exec vite preview --port ${PORT} --host 127.0.0.1 --strictPort`,
    url: `http://127.0.0.1:${PORT}/`,
    reuseExistingServer: process.env.CI === undefined,
    timeout: 120_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
