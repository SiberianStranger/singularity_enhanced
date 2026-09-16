/// <reference types="vitest/config" />
import { fileURLToPath } from "node:url";
import tailwind from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const contentBundle = fileURLToPath(new URL("../content/build/bundle.json", import.meta.url));

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
