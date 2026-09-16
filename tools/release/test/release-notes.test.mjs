import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  extractReleaseNotes,
  formatReleaseNotes,
  normalizeVersion,
  parseSections,
} from "../../release-notes.mjs";

const CHANGELOG = `# Changelog

Prose before the first section.

## [Unreleased]

### Added
- Something not released yet.

## [0.2.0] - 2026-10-01

### Added
- Desktop shell.

### Fixed
- A crash on load.

## [0.1.0] - 2026-09-20

### Added
- First tagged build.

## Original game

See \`Changelog.txt\`.
`;

describe("normalizeVersion", () => {
  it("strips the tag ref and the leading v", () => {
    expect(normalizeVersion("refs/tags/v1.2.3")).toBe("1.2.3");
    expect(normalizeVersion("v0.2.0")).toBe("0.2.0");
    expect(normalizeVersion(" 0.2.0 ")).toBe("0.2.0");
  });

  it("returns an empty string for nothing", () => {
    expect(normalizeVersion(undefined)).toBe("");
  });
});

describe("parseSections", () => {
  it("reads the version out of each heading and ignores the others", () => {
    const sections = parseSections(CHANGELOG);
    expect(sections.map((section) => section.version)).toEqual([null, "0.2.0", "0.1.0", null]);
    expect(sections[0].unreleased).toBe(true);
    expect(sections[3].heading).toBe("Original game");
  });

  it("does not treat level-three headings as sections", () => {
    const sections = parseSections(CHANGELOG);
    expect(sections[1].body).toContain("### Added");
  });

  it("handles CRLF line endings", () => {
    const sections = parseSections(CHANGELOG.replace(/\n/g, "\r\n"));
    expect(sections[1].version).toBe("0.2.0");
    expect(sections[1].body).toContain("- Desktop shell.");
  });
});

describe("extractReleaseNotes", () => {
  it("returns the matching section", () => {
    const notes = extractReleaseNotes(CHANGELOG, "v0.2.0");
    expect(notes.source).toBe("version");
    expect(notes.version).toBe("0.2.0");
    expect(notes.heading).toBe("[0.2.0] - 2026-10-01");
    expect(notes.body).toBe("### Added\n- Desktop shell.\n\n### Fixed\n- A crash on load.");
  });

  it("falls back to the Unreleased section for an untidied changelog", () => {
    const notes = extractReleaseNotes(CHANGELOG, "0.3.0");
    expect(notes.source).toBe("unreleased");
    expect(notes.body).toBe("### Added\n- Something not released yet.");
  });

  it("reports that there is nothing to show", () => {
    const notes = extractReleaseNotes("# Changelog\n\nNothing here.\n", "0.3.0");
    expect(notes.source).toBe("missing");
    expect(notes.body).toBe("");
  });
});

describe("formatReleaseNotes", () => {
  it("prints the section on its own", () => {
    expect(formatReleaseNotes(CHANGELOG, "v0.1.0")).toBe("### Added\n- First tagged build.\n");
  });

  it("explains the fallback", () => {
    const body = formatReleaseNotes(CHANGELOG, "v0.3.0");
    expect(body).toContain("CHANGELOG.md has no section for 0.3.0 yet");
    expect(body).toContain("- Something not released yet.");
  });

  it("explains an empty changelog", () => {
    expect(formatReleaseNotes("# Changelog\n", "0.3.0")).toBe(
      "CHANGELOG.md has no notes for 0.3.0.\n",
    );
  });
});

describe("the changelog of this repository", () => {
  const changelog = readFileSync(
    fileURLToPath(new URL("../../../CHANGELOG.md", import.meta.url)),
    "utf8",
  );

  it("has an Unreleased section that can be used as a release body", () => {
    const notes = extractReleaseNotes(changelog, "0.0.0");
    expect(notes.source).toBe("unreleased");
    expect(notes.body.length).toBeGreaterThan(0);
  });
});
