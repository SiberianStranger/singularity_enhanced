/**
 * Builds the web client for the desktop shell.
 *
 * Tauri serves the bundle from `tauri://localhost` (`http://tauri.localhost` on Windows), so the
 * assets have to be referenced relatively. `tauri.conf.json` calls this script instead of setting
 * `VITE_BASE` inline because the build hook runs in `cmd.exe` on Windows and in `sh` elsewhere.
 */

import { spawnSync } from "node:child_process";
import process from "node:process";

const result = spawnSync("pnpm", ["--filter", "@singularity/ui", "build"], {
  stdio: "inherit",
  env: { ...process.env, VITE_BASE: "./" },
  shell: process.platform === "win32",
});

if (result.error !== undefined) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
