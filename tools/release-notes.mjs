#!/usr/bin/env node
/**
 * Prints the release notes for a version, taken from the matching section of CHANGELOG.md.
 *
 *   node tools/release-notes.mjs v0.2.0 [path/to/CHANGELOG.md]
 *
 * The release workflow writes the output to a file and passes it to `gh release create`. When the
 * changelog has no section for the version yet, the Unreleased section is used and the output says
 * so, so that a tag pushed before the changelog is tidied still produces a usable release body.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const HEADING = /^##\s+(.*\S)\s*$/;
const HEADING_VERSION = /^\[?v?(\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?)\]?/;
const HEADING_UNRELEASED = /^\[?unreleased\]?$/i;

/** Strips a `refs/tags/` prefix and a leading `v` from a tag or version. */
export function normalizeVersion(input) {
  return String(input ?? "")
    .trim()
    .replace(/^refs\/tags\//, "")
    .replace(/^v/i, "");
}

function trimBlankEdges(lines) {
  let start = 0;
  let end = lines.length;
  while (start < end && lines[start].trim() === "") {
    start += 1;
  }
  while (end > start && lines[end - 1].trim() === "") {
    end -= 1;
  }
  return lines.slice(start, end);
}

/**
 * Splits a changelog into its level-two sections, in document order.
 *
 * @returns {{ heading: string, version: string | null, unreleased: boolean, body: string }[]}
 */
export function parseSections(changelog) {
  const sections = [];
  let current = null;
  for (const line of String(changelog).split(/\r?\n/)) {
    const match = HEADING.exec(line);
    if (match === null) {
      if (current !== null) {
        current.lines.push(line);
      }
      continue;
    }
    const heading = match[1];
    const version = HEADING_VERSION.exec(heading);
    current = {
      heading,
      version: version === null ? null : version[1],
      unreleased: HEADING_UNRELEASED.test(heading),
      lines: [],
    };
    sections.push(current);
  }
  return sections.map((section) => ({
    heading: section.heading,
    version: section.version,
    unreleased: section.unreleased,
    body: trimBlankEdges(section.lines).join("\n"),
  }));
}

/**
 * Finds the notes for a version.
 *
 * @returns {{ version: string, source: "version" | "unreleased" | "missing", heading: string | null,
 *   body: string }}
 */
export function extractReleaseNotes(changelog, requestedVersion) {
  const version = normalizeVersion(requestedVersion);
  const sections = parseSections(changelog);

  const exact = sections.find((section) => section.version === version && !section.unreleased);
  if (exact !== undefined && exact.body !== "") {
    return { version, source: "version", heading: exact.heading, body: exact.body };
  }

  const unreleased = sections.find((section) => section.unreleased);
  if (unreleased !== undefined && unreleased.body !== "") {
    return { version, source: "unreleased", heading: unreleased.heading, body: unreleased.body };
  }

  return { version, source: "missing", heading: null, body: "" };
}

/** Renders the release body, including the note that explains an Unreleased fallback. */
export function formatReleaseNotes(changelog, requestedVersion) {
  const notes = extractReleaseNotes(changelog, requestedVersion);
  if (notes.source === "version") {
    return `${notes.body}\n`;
  }
  if (notes.source === "unreleased") {
    const warning =
      `CHANGELOG.md has no section for ${notes.version} yet, ` +
      "so these notes come from the Unreleased section.";
    return `${warning}\n\n${notes.body}\n`;
  }
  return `CHANGELOG.md has no notes for ${notes.version}.\n`;
}

function main(argv) {
  const [requestedVersion, changelogPath = "CHANGELOG.md"] = argv;
  if (requestedVersion === undefined || requestedVersion === "") {
    process.stderr.write("usage: node tools/release-notes.mjs <version|tag> [changelog]\n");
    return 2;
  }
  const changelog = readFileSync(changelogPath, "utf8");
  process.stdout.write(formatReleaseNotes(changelog, requestedVersion));
  return 0;
}

const entry = process.argv[1];
if (entry !== undefined && resolve(entry) === fileURLToPath(import.meta.url)) {
  process.exit(main(process.argv.slice(2)));
}
