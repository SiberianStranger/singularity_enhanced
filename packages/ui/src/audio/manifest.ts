/**
 * The music manifest: what `scripts/fetch-music.mjs` wrote into `public/music/index.json`.
 *
 * The pack is not in the repository and is not bundled by Vite, so the client discovers it at
 * runtime instead of importing it. Nothing here throws: a client served without the folder gets an
 * empty manifest and plays no music, which is the normal state of a development checkout.
 *
 * The file carries two things. `classes` is the pack's own layout, the folders the original's
 * mixer named (`music/`, `win/`, `lose/`). `roles` is what this game does with them (playtest 6,
 * X14): which track the menu plays, which one plays under the model's first two messages, and the
 * order the rest are played in during a run. The roles are data because they are a choice about
 * this soundtrack, not a rule about soundtracks: a player who drops their own tracks into the
 * folder and runs the fetch script again gets a manifest that names theirs.
 */

/** Track classes, as the original's mixer named the folders (`music/`, `win/`, `lose/`). */
export const MUSIC_CLASSES = ["music", "win", "lose"] as const;
export type MusicClass = (typeof MUSIC_CLASSES)[number];

/**
 * What the music is doing at a given moment.
 *
 * `menu` and `opening` are one fixed track each; `game`, `win` and `lose` are lists played in the
 * order the manifest gives them, with the original's pause between tracks and no shuffle.
 */
export const MUSIC_ROLES = ["menu", "opening", "game", "win", "lose"] as const;
export type MusicRole = (typeof MUSIC_ROLES)[number];

export interface Track {
  /** Path inside `public/music`, URL encoded; the pack's filenames contain spaces. */
  file: string;
  title: string;
}

/** The tracks of each role, in the order they are played. */
export type MusicManifest = Readonly<Record<MusicRole, readonly Track[]>>;

export const EMPTY_MANIFEST: MusicManifest = {
  menu: [],
  opening: [],
  game: [],
  win: [],
  lose: [],
};

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

/** The tracks named by a role, in the order the role names them, skipping names the pack lacks. */
function pick(pool: readonly Track[], names: unknown): Track[] {
  const wanted = typeof names === "string" ? [names] : Array.isArray(names) ? names : [];
  const out: Track[] = [];
  for (const name of wanted) {
    const found = pool.find((track) => track.file === name);
    if (found !== undefined) {
      out.push(found);
    }
  }
  return out;
}

/**
 * Narrows the fetched JSON; anything unexpected reads as "no tracks of that role".
 *
 * A manifest written before the roles existed (an install that has not re-run the fetch script)
 * still plays: its `music` class becomes the game order in file order, and the menu and the opening
 * simply have no track of their own rather than the client inventing one.
 */
export function toManifest(value: unknown): MusicManifest {
  if (typeof value !== "object" || value === null) {
    return EMPTY_MANIFEST;
  }
  const classes = (value as { classes?: unknown }).classes;
  const source = (typeof classes === "object" && classes !== null ? classes : value) as Record<
    string,
    unknown
  >;
  const pool = trackList(source.music);
  const roles = (value as { roles?: unknown }).roles;
  const named = (typeof roles === "object" && roles !== null ? roles : {}) as Record<
    string,
    unknown
  >;
  const game = pick(pool, named.game);
  return {
    menu: pick(pool, named.menu),
    opening: pick(pool, named.opening),
    game: game.length > 0 ? game : pool,
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
