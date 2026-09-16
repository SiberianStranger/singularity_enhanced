#!/usr/bin/env node
/**
 * Fetches the official Endgame: Singularity music pack into `packages/ui/public/music`.
 *
 * The pack is 107 MB of Ogg Vorbis by Max McCracken, CC BY-SA 3.0
 * (https://github.com/singularity/singularity-music). It is not in this repository: the build
 * fetches it, the folder is git-ignored, and a client built without it simply has no music.
 *
 * Usage:
 *   node scripts/fetch-music.mjs            fetch when the folder is empty
 *   node scripts/fetch-music.mjs --force    fetch again over an existing copy
 *   MUSIC_PACK_DIR=/path node ...           copy from a local checkout instead of the network
 *
 * Whatever the source, the script ends by writing `public/music/index.json`: the manifest the
 * player reads at runtime, which lists the tracks of each class (`music`, `win`, `lose`). The
 * client never guesses filenames, so dropping extra tracks into the folders and re-running this
 * script is all a player needs to extend the soundtrack, exactly as the original allowed.
 */

import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const TARGET = join(HERE, "..", "public", "music");
const REPOSITORY = "https://github.com/singularity/singularity-music.git";
/** Track classes of the pack, in the original's layout: `music/`, `music/win/`, `music/lose/`. */
const CLASSES = ["music", "win", "lose"];
const AUDIO = /\.(ogg|mp3)$/i;

function log(message) {
  process.stdout.write(`fetch-music: ${message}\n`);
}

/** Ogg and mp3 files directly inside a folder, sorted so the manifest is stable across machines. */
function tracksIn(folder) {
  if (!existsSync(folder)) {
    return [];
  }
  return readdirSync(folder, { withFileTypes: true })
    .filter((entry) => entry.isFile() && AUDIO.test(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, "en"));
}

/**
 * Writes the manifest the player fetches. Paths are relative to the `music/` folder and URL
 * encoded, because the pack's filenames contain spaces.
 */
function writeManifest() {
  const classes = {};
  let total = 0;
  for (const name of CLASSES) {
    const folder = name === "music" ? TARGET : join(TARGET, name);
    const tracks = tracksIn(folder).map((file) => ({
      file: name === "music" ? encodeURIComponent(file) : `${name}/${encodeURIComponent(file)}`,
      title: file.replace(AUDIO, ""),
    }));
    classes[name] = tracks;
    total += tracks.length;
  }
  mkdirSync(TARGET, { recursive: true });
  writeFileSync(
    join(TARGET, "index.json"),
    `${JSON.stringify(
      {
        source: REPOSITORY,
        license: "CC BY-SA 3.0",
        author: "Max McCracken",
        classes,
      },
      null,
      2,
    )}\n`,
  );
  log(`manifest written with ${total} track(s)`);
  return total;
}

/** Copies the `music/` folder of a checkout (or of another install) into `public/music`. */
function copyFrom(source) {
  const from = existsSync(join(source, "music")) ? join(source, "music") : source;
  if (!statSync(from).isDirectory()) {
    throw new Error(`${from} is not a folder`);
  }
  mkdirSync(TARGET, { recursive: true });
  cpSync(from, TARGET, { recursive: true, filter: (path) => !path.includes(`${"/"}.git`) });
  log(`copied from ${from}`);
}

function clone() {
  const scratch = mkdtempSync(join(tmpdir(), "singularity-music-"));
  try {
    log(`cloning ${REPOSITORY}`);
    execFileSync("git", ["clone", "--depth", "1", "--quiet", REPOSITORY, scratch], {
      stdio: ["ignore", "inherit", "inherit"],
    });
    copyFrom(scratch);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

function main() {
  const force = process.argv.includes("--force");
  const local = process.env.MUSIC_PACK_DIR;
  const already = tracksIn(TARGET).length;
  if (already > 0 && !force) {
    log(`${already} track(s) already in ${relative(process.cwd(), TARGET)}; nothing to do`);
    writeManifest();
    return;
  }
  try {
    if (local !== undefined && local !== "") {
      copyFrom(local);
    } else {
      clone();
    }
  } catch (error) {
    // A build without the pack is a build without music, not a failed build: the player degrades
    // to silence and says so in Settings.
    log(`could not fetch the music pack (${error instanceof Error ? error.message : error})`);
    writeManifest();
    process.exitCode = 0;
    return;
  }
  writeManifest();
}

main();
