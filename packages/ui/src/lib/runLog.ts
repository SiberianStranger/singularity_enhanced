/**
 * The run log the player can hand over (playtest 8, Z9).
 *
 * A playtest finding that reaches the repository as prose has already lost most of what the run
 * knew. This writes the rest of it to a JSON file the maintainer can open or attach: the build and
 * the content bundle it was played against, the setup the run started from, the journal and the log
 * the client is holding, every command the engine refused with its key and its variables, the last
 * view, the settings, and the browser and the window it was played in.
 *
 * Nothing goes into it that the player did not generate. There is no account, no address and no
 * identifier beyond the user-agent string the browser sends to every site anyway, and no save data
 * except the view the client was already rendering.
 */

import type { GameSetup, PlayerView } from "@singularity/core";
import { contentBundle } from "../content/bundle.js";
import { type RefusalRecord, useGameStore } from "../store/gameStore.js";
import { useUiStore } from "../store/uiStore.js";

export const RUN_LOG_FORMAT = "singularity-run-log";
export const RUN_LOG_VERSION = 1;

/** The build that wrote the file: `__APP_VERSION__`, defined in `vite.config.ts`. */
export function buildVersion(): string {
  return typeof __APP_VERSION__ === "string" && __APP_VERSION__ !== "" ? __APP_VERSION__ : "dev";
}

/**
 * A stable fingerprint of the content bundle, as 8 hex digits.
 *
 * FNV-1a over the bundle's own JSON: it has no version field of its own, and what the maintainer
 * needs from it is only "was this the same content as mine", which a hash answers exactly. It is
 * computed once and cached, because the bundle is well over a megabyte.
 */
let cachedHash: string | null = null;

export function contentHash(): string {
  if (cachedHash !== null) {
    return cachedHash;
  }
  const text = JSON.stringify(contentBundle);
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  cachedHash = hash.toString(16).padStart(8, "0");
  return cachedHash;
}

export interface RunLog {
  format: typeof RUN_LOG_FORMAT;
  version: number;
  build: { version: string; content_hash: string; host: string };
  /** Real time the file was written; the run's own clock is in `view.date`. */
  written_at: string;
  setup: GameSetup | null;
  journal: PlayerView["journal"];
  log: PlayerView["log"];
  refusals: RefusalRecord[];
  view: PlayerView | null;
  settings: Record<string, unknown>;
  browser: {
    user_agent: string;
    language: string;
    viewport: { width: number; height: number };
    device_pixel_ratio: number;
  };
}

/** The settings the client persists, as the file records them: the UI store's own shape. */
function settingsOf(): Record<string, unknown> {
  const state = useUiStore.getState();
  return {
    theme: state.theme,
    language: state.language,
    ui_scale: state.uiScale,
    ui_scale_auto: state.uiScaleAuto,
    display_scale: state.displayScale,
    font_face: state.fontFace,
    map_style: state.mapStyle,
    map_mode: state.mapMode,
    crt: state.crt,
    audio: { ...state.audio },
    message_preset: state.messagePreset,
    message_modes: { ...state.messageModes },
    tech_window: state.techWindow,
    autosave_days: state.autosaveDays,
  };
}

export function buildRunLog(now: Date = new Date()): RunLog {
  const game = useGameStore.getState();
  const view = game.view;
  const width = typeof window === "undefined" ? 0 : window.innerWidth;
  const height = typeof window === "undefined" ? 0 : window.innerHeight;
  return {
    format: RUN_LOG_FORMAT,
    version: RUN_LOG_VERSION,
    build: {
      version: buildVersion(),
      content_hash: contentHash(),
      host: import.meta.env.VITE_HOST ?? "worker",
    },
    written_at: now.toISOString(),
    setup: game.setup,
    journal: [...(view?.journal ?? [])],
    log: [...(view?.log ?? [])],
    refusals: [...game.refusals],
    view,
    settings: settingsOf(),
    browser: {
      user_agent: typeof navigator === "undefined" ? "" : navigator.userAgent,
      language: typeof navigator === "undefined" ? "" : navigator.language,
      viewport: { width, height },
      device_pixel_ratio: typeof window === "undefined" ? 1 : window.devicePixelRatio,
    },
  };
}

/** The file's name: the build and the game day, so two logs from one run do not collide. */
export function runLogFilename(log: RunLog): string {
  const day = log.view === null ? 0 : Math.floor(log.view.tick / 24);
  const stamp = log.written_at.slice(0, 19).replace(/[:T]/g, "-");
  return `singularity-run-${log.build.version}-day${day}-${stamp}.json`;
}

/**
 * Writes the run log to a file the browser downloads.
 *
 * A blob and an anchor, which is what both shells give the player a file with: the web build saves
 * through the browser's own download, and the desktop shell (Tauri 2 with the default download
 * behaviour) puts the same file in the download directory. Nothing here needs a native dialog, so
 * nothing here has a desktop-only path that the web build cannot test.
 */
export function downloadRunLog(log: RunLog = buildRunLog()): string {
  const name = runLogFilename(log);
  if (typeof document === "undefined" || typeof URL.createObjectURL !== "function") {
    return name;
  }
  const blob = new Blob([JSON.stringify(log, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Revoked on the next frame: revoking it in the same turn can cancel the download in some
  // browsers, and holding it forever leaks the blob.
  setTimeout(() => URL.revokeObjectURL(url), 0);
  return name;
}
