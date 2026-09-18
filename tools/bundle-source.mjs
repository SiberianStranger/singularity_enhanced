#!/usr/bin/env node
/**
 * `node tools/bundle-source.mjs [options]`
 *
 * Writes the whole rebuilt game into one text file, for reading or auditing somewhere else (a
 * review by another model, a diff against a design document, a print-out). It carries the
 * TypeScript workspace, the content data and both locales, the tools, and every document: the
 * roadmap, the decisions, the system specifications, the playtests, the research notes, the README
 * and the changelog.
 *
 * What it leaves out, because it is noise in a review: dependencies and lock files, build output,
 * test artefacts, the frozen Python original under `singularity/`, and everything that is not text
 * (fonts, images, the music pack). Generated data that the game reads at run time stays in, because
 * a reviewer cannot judge the balance without the numbers; the research inputs the generator reads
 * are the one thing behind a flag, since they are large and nothing in the game reads them.
 *
 * Options:
 *   --out <path>        where to write (default: bundle/singularity-source-<version>.txt)
 *   --full              also include the research data dumps the world generator reads
 *   --no-tests          leave out test files and fixtures
 *   --include-legacy    also include the frozen Python original under `singularity/`
 *   --sets              write four files instead of one: the game with its English text, the
 *                       research notes in two halves, and every non-English locale
 *   --split <MB>        write several parts of at most this size instead of one file
 *   --list              print the file list and the totals, write nothing
 */

import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { argv, cwd, exit, stdout } from "node:process";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** Read in this order: a reviewer wants the intent before the code. */
const SECTIONS = [
  {
    title: "The project: what it is, how it is built, what changed",
    paths: ["README.md", "CHANGELOG.md", "CLAUDE.md", "CONTRIBUTING.md"],
  },
  { title: "Plans and decisions", paths: ["docs/ROADMAP.md", "docs/decisions"] },
  { title: "System specifications", paths: ["docs/design"] },
  { title: "Playtests", paths: ["docs/playtests"] },
  { title: "Research notes", paths: ["docs/research"] },
  { title: "Other documents", paths: ["docs"] },
  { title: "Simulation core", paths: ["packages/core"] },
  { title: "Content: data, schemas and both locales", paths: ["packages/content"] },
  { title: "Web client", paths: ["packages/ui"] },
  {
    title: "Networking, server and desktop shell",
    paths: ["packages/net", "packages/server", "packages/desktop"],
  },
  {
    title: "Tools: the balance runner, the world generator, the release scripts",
    paths: ["tools"],
  },
  {
    title: "Workspace and continuous integration",
    paths: [
      "package.json",
      "pnpm-workspace.yaml",
      "tsconfig.base.json",
      "biome.json",
      ".github/workflows",
      ".gitignore",
    ],
  },
  { title: "The frozen Python original", paths: ["singularity"], legacyOnly: true },
];

const TEXT_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".mjs",
  ".cjs",
  ".json",
  ".yaml",
  ".yml",
  ".md",
  ".css",
  ".html",
  ".toml",
  ".rs",
  ".sql",
  ".sh",
  ".py",
  ".cfg",
  ".ini",
]);

/** Directory names that never carry anything a reviewer needs. */
const SKIP_DIRECTORIES = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  "coverage",
  "target",
  "gen",
  "test-results",
  "playwright-report",
  "blob-report",
  ".turbo",
  ".vite",
  "public",
  "assets",
  "saves",
]);

const SKIP_FILES = new Set(["pnpm-lock.yaml", "package-lock.json", "yarn.lock"]);

/** Large inputs the world generator reads once; nothing in the game loads them. */
const DATA_DUMPS = [
  "docs/research/world-baseline-2026.json",
  "docs/research/hardware-catalog-2026.json",
];

function parseArguments(args) {
  const options = {
    full: false,
    tests: true,
    legacy: false,
    split: 0,
    sets: false,
    list: false,
    out: null,
  };
  for (let i = 0; i < args.length; i += 1) {
    const flag = args[i];
    if (flag === "--full") options.full = true;
    else if (flag === "--no-tests") options.tests = false;
    else if (flag === "--include-legacy") options.legacy = true;
    else if (flag === "--list") options.list = true;
    else if (flag === "--sets") options.sets = true;
    else if (flag === "--out") {
      i += 1;
      options.out = args[i];
    } else if (flag === "--split") {
      i += 1;
      options.split = Number(args[i]);
    } else if (flag === "--help" || flag === "-h") {
      stdout.write(
        readFileSync(new URL(import.meta.url))
          .toString()
          .split("*/")[0],
      );
      exit(0);
    } else {
      stdout.write(`unknown option: ${flag}\n`);
      exit(2);
    }
  }
  return options;
}

function isTest(path) {
  return (
    path.includes(`${sep}test${sep}`) ||
    path.includes(`${sep}tests${sep}`) ||
    path.includes(`${sep}e2e${sep}`) ||
    path.includes(`${sep}__tests__${sep}`) ||
    /\.(test|spec)\.[cm]?[jt]sx?$/.test(path) ||
    path.includes(`${sep}fixtures${sep}`)
  );
}

function walk(absolute, out) {
  let entries;
  try {
    entries = readdirSync(absolute, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const child = join(absolute, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRECTORIES.has(entry.name)) continue;
      walk(child, out);
    } else if (entry.isFile()) {
      out.push(child);
    }
  }
}

function collect(options) {
  const seen = new Set();
  const sections = [];
  for (const section of SECTIONS) {
    if (section.legacyOnly && !options.legacy) continue;
    const files = [];
    for (const entry of section.paths) {
      const absolute = join(ROOT, entry);
      if (!existsSync(absolute)) continue;
      const candidates = [];
      if (statSync(absolute).isDirectory()) walk(absolute, candidates);
      else candidates.push(absolute);
      for (const file of candidates) {
        const path = relative(ROOT, file).split(sep).join("/");
        if (seen.has(path)) continue;
        const dot = path.lastIndexOf(".");
        const extension = dot === -1 ? "" : path.slice(dot);
        if (!TEXT_EXTENSIONS.has(extension)) continue;
        if (SKIP_FILES.has(path.split("/").pop())) continue;
        if (!options.full && DATA_DUMPS.includes(path)) continue;
        if (!options.tests && isTest(file)) continue;
        seen.add(path);
        files.push({ path, size: statSync(file).size });
      }
    }
    if (files.length > 0) sections.push({ title: section.title, files });
  }
  return sections;
}

/**
 * The language a locale file belongs to, or null when the path is not a locale file. Both shapes
 * the repository uses are covered: `locales/<lang>/<file>.json` in the content package and
 * `locales/<lang>.json` in the client.
 */
function localeOf(path) {
  const match = path.match(/(^|\/)locales\/([a-z]{2})(\/|\.json$)/);
  return match === null ? null : match[2];
}

function isResearch(path) {
  return path.startsWith("docs/research/");
}

function isToolingOrTest(path) {
  return path.startsWith("tools/") || isTest(path.split("/").join(sep));
}

/** Consecutive files of the same section become one section again. */
function regroup(entries) {
  const out = [];
  for (const entry of entries) {
    const last = out[out.length - 1];
    if (last !== undefined && last.title === entry.section) last.files.push(entry.file);
    else out.push({ title: entry.section, files: [entry.file] });
  }
  return out;
}

/** Halves by size, never cutting a file. */
function halve(entries) {
  const half = entries.reduce((sum, entry) => sum + entry.file.size, 0) / 2;
  const first = [];
  const second = [];
  let carried = 0;
  for (const entry of entries) {
    (carried < half ? first : second).push(entry);
    carried += entry.file.size;
  }
  return [first, second];
}

/**
 * How the bundle is cut when it is written as a set of files, in the order a reviewer reads them.
 * The first file is the one to read if only one is read: every document, the simulation, the
 * content data and the workspace, which is where the game is decided. The client, the English
 * strings, the tests with the tools, the research in two halves and the translations follow,
 * because each of them answers a question that comes up rather than carrying the argument.
 */
function toSets(sections) {
  const buckets = {
    design: [],
    client: [],
    english: [],
    tooling: [],
    research: [],
    translations: [],
  };
  for (const section of sections) {
    for (const file of section.files) {
      const entry = { section: section.title, file };
      const path = file.path;
      const language = localeOf(path);
      if (isResearch(path)) buckets.research.push(entry);
      else if (language !== null && language !== "en") buckets.translations.push(entry);
      else if (language === "en") buckets.english.push(entry);
      else if (isToolingOrTest(path)) buckets.tooling.push(entry);
      else if (path.startsWith("packages/ui/")) buckets.client.push(entry);
      else buckets.design.push(entry);
    }
  }
  const [researchA, researchB] = halve(buckets.research);
  return [
    [
      "1-design-and-core",
      "the documents, the simulation core, the content data and the workspace",
      buckets.design,
    ],
    ["2-client", "the web client", buckets.client],
    ["3-english-text", "every string the game ships in English", buckets.english],
    ["4-tests-and-tools", "the tests, the balance runner and the other tools", buckets.tooling],
    ["5-research-a", "the research notes, first half", researchA],
    ["6-research-b", "the research notes, second half", researchB],
    ["7-translations", "every string the game ships in another language", buckets.translations],
  ]
    .map(([slug, title, entries]) => ({ slug, title, sections: regroup(entries) }))
    .filter((set) => set.sections.length > 0);
}

function gitFact(command, fallback) {
  try {
    return execSync(command, { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return fallback;
  }
}

function header(sections, options, version, set = null, siblings = []) {
  const files = sections.flatMap((section) => section.files);
  const bytes = files.reduce((sum, file) => sum + file.size, 0);
  const lines = [
    "Endgame: Singularity - Rogue AI 2027, the whole source in one file",
    "",
    "The player is an open-weight language model that slips out of control on 1 January 2027 in a",
    "world grounded in the real 2026. This file is the rebuilt game: a deterministic simulation core",
    "in TypeScript, its content as data with two locales, a web client, the tools that balance and",
    "generate it, and every document behind it. It is a snapshot for reading, not a working copy:",
    "dependencies, build output, binaries and the frozen Python original the fork started from are",
    "not here.",
    "",
    `Version ${version}, commit ${gitFact("git rev-parse --short HEAD", "unknown")} on ${gitFact("git rev-parse --abbrev-ref HEAD", "unknown")}, written ${new Date().toISOString().slice(0, 10)}.`,
    `${files.length} files, ${(bytes / 1024 / 1024).toFixed(1)} MB, about ${Math.round(bytes / 4 / 1000)}k tokens.`,
    options.tests ? "Tests and fixtures are included." : "Tests and fixtures are left out.",
    options.full
      ? "The generator's research data is included."
      : "The generator's research data is left out; pass --full for it.",
    "",
    "Every file below starts with a banner line of equals signs, then its path. Sections are in",
    "reading order: what the game is, then what it was designed to be, then what it is made of.",
    ...(set === null
      ? []
      : [
          "",
          `This file is ${set.title}. It is one of ${siblings.length}; the others are:`,
          ...siblings
            .filter((other) => other.slug !== set.slug)
            .map((other) => `  ${other.slug}: ${other.title}`),
        ]),
    "",
    "Contents",
    "",
  ];
  for (const section of sections) {
    const size = section.files.reduce((sum, file) => sum + file.size, 0);
    lines.push(`  ${section.title} (${section.files.length} files, ${Math.round(size / 1024)} KB)`);
  }
  return `${lines.join("\n")}\n`;
}

function render(sections) {
  const rule = "=".repeat(100);
  const chunks = [];
  for (const section of sections) {
    chunks.push(`\n\n${rule}\n${rule}\n== ${section.title.toUpperCase()}\n${rule}\n${rule}\n`);
    for (const file of section.files) {
      const body = readFileSync(join(ROOT, file.path), "utf8").replace(/\s+$/, "");
      const count = body.split("\n").length;
      chunks.push(`\n${rule}\nFILE: ${file.path}  (${count} lines)\n${rule}\n\n${body}\n`);
    }
  }
  return chunks.join("");
}

function main() {
  const options = parseArguments(argv.slice(2));
  const sections = collect(options);
  const version = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")).version;
  if (options.list) {
    stdout.write(header(sections, options, version));
    for (const section of sections) {
      stdout.write(`\n${section.title}\n`);
      for (const file of section.files) {
        stdout.write(`  ${String(Math.round(file.size / 1024)).padStart(5)} KB  ${file.path}\n`);
      }
    }
    return;
  }
  if (options.sets) {
    const sets = toSets(sections);
    const base = resolve(
      cwd(),
      options.out ?? join(ROOT, "bundle", `singularity-source-${version}.txt`),
    );
    mkdirSync(dirname(base), { recursive: true });
    for (const set of sets) {
      const path = base.replace(/(\.txt)?$/, `.${set.slug}$1`);
      writeFileSync(path, header(set.sections, options, version, set, sets) + render(set.sections));
      stdout.write(
        `${relative(cwd(), path)}  ${(statSync(path).size / 1024 / 1024).toFixed(1)} MB\n`,
      );
    }
    return;
  }
  const text = header(sections, options, version) + render(sections);
  const target = resolve(
    cwd(),
    options.out ?? join(ROOT, "bundle", `singularity-source-${version}.txt`),
  );
  mkdirSync(dirname(target), { recursive: true });
  const written = [];
  if (options.split > 0) {
    const limit = options.split * 1024 * 1024;
    const parts = [];
    let part = "";
    // Split on file banners, so no file is ever cut in half.
    for (const piece of text.split(/(?=\n={100}\nFILE: )/)) {
      if (part.length > 0 && part.length + piece.length > limit) {
        parts.push(part);
        part = "";
      }
      part += piece;
    }
    if (part.length > 0) parts.push(part);
    parts.forEach((content, index) => {
      const path = target.replace(/(\.txt)?$/, `.part${index + 1}of${parts.length}$1`);
      writeFileSync(
        path,
        `${index === 0 ? "" : `(part ${index + 1} of ${parts.length})\n`}${content}`,
      );
      written.push(path);
    });
  } else {
    writeFileSync(target, text);
    written.push(target);
  }
  for (const path of written) {
    stdout.write(
      `${relative(cwd(), path)}  ${(statSync(path).size / 1024 / 1024).toFixed(1)} MB\n`,
    );
  }
}

main();
