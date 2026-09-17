/// <reference types="vitest/config" />
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import tailwind from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const contentBundle = fileURLToPath(new URL("../content/build/bundle.json", import.meta.url));

/**
 * The workspace's version, baked in as `__APP_VERSION__` (playtest 8, Z9). The run log the player
 * hands over has to say which build wrote it, and the client had no way of knowing.
 */
const version = (
  JSON.parse(
    readFileSync(fileURLToPath(new URL("../../package.json", import.meta.url)), "utf8"),
  ) as { version?: string }
).version;

export default defineConfig({
  // Deployment base path: "/" for `pnpm dev` and for serving the bundle at a domain root, "./"
  // for the desktop shell (set by packages/desktop), "/singularity_enhanced/" for GitHub Pages.
  base: process.env.VITE_BASE ?? "/",
  plugins: [react(), tailwind()],
  resolve: {
    alias: {
      "@content/bundle": contentBundle,
    },
  },
  define: { __APP_VERSION__: JSON.stringify(version ?? "dev") },
  worker: { format: "es" },
  build: {
    target: "es2022",
    outDir: "dist",
    sourcemap: true,
    chunkSizeWarningLimit: 1200,
  },
  test: {
    environment: "jsdom",
    env: { VITE_HOST: "mock" },
    globals: false,
    setupFiles: ["./test/setup.ts"],
    include: ["test/**/*.test.ts", "test/**/*.test.tsx"],
    css: false,
    restoreMocks: true,
  },
});
