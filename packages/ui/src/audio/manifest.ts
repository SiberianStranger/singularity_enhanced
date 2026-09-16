/**
 * The music manifest: what `scripts/fetch-music.mjs` wrote into `public/music/index.json`.
 *
 * The pack is not in the repository and is not bundled by Vite, so the client discovers it at
 * runtime instead of importing it. Nothing here throws: a client served without the folder gets an
 * empty manifest and plays no music, which is the normal state of a development checkout.
 */

/** Track classes, as the original's mixer named the folders (`music/`, `win/`, `lose/`). */
export const MUSIC_CLASSES = ["music", "win", "lose"] as const;
export type MusicClass = (typeof MUSIC_CLASSES)[number];

export interface Track {
  /** Path inside `public/music`, URL encoded; the pack's filenames contain spaces. */
  file: string;
  title: string;
}

export type MusicManifest = Readonly<Record<MusicClass, readonly Track[]>>;

export const EMPTY_MANIFEST: MusicManifest = { music: [], win: [], lose: [] };

/** Where the folder is served from, honouring the Vite deployment base (Pages, desktop, root). */
export function musicBase(): string {
  const base = import.meta.env.BASE_URL || "/";
  return `${base.endsWith("/") ? base : `${base}/`}music/`;
}

function trackList(value: unknown): Track[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const out: Track[] = [];
  for (const entry of value) {
    if (typeof entry === "object" && entry !== null) {
      const record = entry as { file?: unknown; title?: unknown };
      if (typeof record.file === "string" && record.file.length > 0) {
        out.push({
          file: record.file,
          title: typeof record.title === "string" ? record.title : record.file,
        });
      }
    }
  }
  return out;
}

/** Narrows the fetched JSON; anything unexpected reads as "no tracks of that class". */
export function toManifest(value: unknown): MusicManifest {
  if (typeof value !== "object" || value === null) {
    return EMPTY_MANIFEST;
  }
  const classes = (value as { classes?: unknown }).classes;
  const source = (typeof classes === "object" && classes !== null ? classes : value) as Record<
    string,
    unknown
  >;
  return {
    music: trackList(source.music),
    win: trackList(source.win),
    lose: trackList(source.lose),
  };
}

/**
 * Reads the manifest. A missing folder (404) or a checkout without the pack resolves to the empty
 * manifest rather than rejecting, because "no music" is a supported configuration.
 */
export async function loadManifest(fetcher: typeof fetch = fetch): Promise<MusicManifest> {
  try {
    const response = await fetcher(`${musicBase()}index.json`, { cache: "no-cache" });
    if (!response.ok) {
      return EMPTY_MANIFEST;
    }
    return toManifest(await response.json());
  } catch {
    return EMPTY_MANIFEST;
  }
}
