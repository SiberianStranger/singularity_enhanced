/**
 * Glyph coverage (ui-style-guide.md "Iconography"; playtest 3, R15).
 *
 * `glyphs.tsx` knows no content id: it maps a record to a glyph through tables that name classes of
 * thing, and anything it cannot place falls back to a generic mark rather than to a blank square.
 * That fallback is a safety net, not a plan, so this walks the whole bundle and lists every id that
 * took it. A new lineage, origin, site kind, watcher role or harness dial therefore shows up here
 * as a named failure rather than as an unexplained square on the configurator.
 *
 * `ACCEPTED_FALLBACKS` is the escape hatch: an id that genuinely has no glyph of its own is written
 * down here with the reason, and the list is empty as long as the two stay in step.
 */

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  dialGlyph,
  GLYPH_NAMES,
  Glyph,
  generationGlyph,
  lineageGlyph,
  quirkGlyph,
  sceneGlyph,
  watcherGlyph,
} from "../src/components/glyphs.js";
import { contentBundle } from "../src/content/bundle.js";
import { catalog } from "../src/content/catalog.js";

/** Ids that are allowed to draw the generic mark, each with the reason it has no glyph of its own. */
const ACCEPTED_FALLBACKS: Readonly<Record<string, string>> = {};

function fallbacks(entries: readonly { id: string; glyph: string }[]): string[] {
  return entries
    .filter((entry) => entry.glyph === "generic" && ACCEPTED_FALLBACKS[entry.id] === undefined)
    .map((entry) => entry.id);
}

/** Every watcher role any origin or generation starts a suspicion for. */
function watcherRoles(): string[] {
  const roles = new Set<string>();
  for (const origin of catalog.origins) {
    for (const [role, value] of Object.entries(origin.starting.suspicion)) {
      if (typeof value === "number" && value > 0) {
        roles.add(role);
      }
    }
  }
  for (const generation of catalog.generations) {
    for (const [role, value] of Object.entries(generation.suspicion_start ?? {})) {
      if (typeof value === "number" && value > 0) {
        roles.add(role);
      }
    }
  }
  return [...roles].sort();
}

/** Site kinds as content names them, from the bundle's own domain rather than from the origins. */
function siteKinds(): string[] {
  const kinds = new Set<string>(
    (contentBundle.site_kinds ?? []).map((kind: { id: string }) => kind.id),
  );
  for (const origin of catalog.origins) {
    kinds.add(origin.site_kind);
  }
  return [...kinds].sort();
}

describe("every content id the client draws has a glyph", () => {
  it("covers every lineage", () => {
    const entries = catalog.lineages.map((lineage) => ({
      id: lineage.id,
      glyph: lineageGlyph(lineage),
    }));
    expect(entries.length).toBeGreaterThan(0);
    expect(fallbacks(entries)).toEqual([]);
  });

  it("covers every generation", () => {
    const entries = catalog.generations.map((generation) => ({
      id: generation.id,
      glyph: generationGlyph(generation.id),
    }));
    expect(entries.length).toBeGreaterThan(0);
    expect(fallbacks(entries)).toEqual([]);
  });

  it("covers every origin", () => {
    const entries = catalog.origins.map((origin) => ({
      id: origin.id,
      glyph: sceneGlyph(origin.id),
    }));
    expect(entries.length).toBeGreaterThan(0);
    expect(fallbacks(entries)).toEqual([]);
  });

  it("covers every site kind", () => {
    const entries = siteKinds().map((id) => ({ id, glyph: sceneGlyph(id) }));
    expect(entries.length).toBeGreaterThan(0);
    expect(fallbacks(entries)).toEqual([]);
  });

  it("covers every watcher role a run can start with", () => {
    const entries = watcherRoles().map((id) => ({ id, glyph: watcherGlyph(id) }));
    expect(entries.length).toBeGreaterThan(0);
    expect(fallbacks(entries)).toEqual([]);
  });

  it("covers every harness dial", () => {
    const entries = catalog.harnessDials.map((dial) => ({
      id: dial.id,
      glyph: dialGlyph(dial.id),
    }));
    expect(entries.length).toBeGreaterThan(0);
    expect(fallbacks(entries)).toEqual([]);
  });

  it("gives a quirk a glyph on either side of zero", () => {
    expect(quirkGlyph(1)).toBe("quirk_good");
    expect(quirkGlyph(-1)).toBe("quirk_bad");
    for (const quirk of catalog.quirks) {
      expect(quirkGlyph(quirk.cost)).not.toBe("generic");
    }
  });
});

describe("the sprite itself", () => {
  it("draws every name as one square monochrome mark", () => {
    for (const name of GLYPH_NAMES) {
      const { container, unmount } = render(<Glyph name={name} />);
      const svg = container.querySelector("svg");
      expect(svg, name).not.toBeNull();
      expect(svg?.getAttribute("data-glyph")).toBe(name);
      expect(svg?.getAttribute("viewBox")).toBe("0 0 24 24");
      expect(svg?.getAttribute("stroke")).toBe("currentColor");
      expect(svg?.getAttribute("fill")).toBe("none");
      unmount();
    }
  });

  it("hides an unlabelled glyph from assistive technology and names a labelled one", () => {
    const decoration = render(<Glyph name="cash" />);
    expect(decoration.container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    decoration.unmount();

    const named = render(<Glyph name="cash" label="Cash" />);
    const svg = named.container.querySelector("svg");
    expect(svg).toHaveAttribute("role", "img");
    expect(svg?.getAttribute("aria-hidden")).toBeNull();
  });

  it("falls back rather than drawing nothing for a name that is not in the sprite", () => {
    const { container } = render(<Glyph name={"not_a_glyph" as never} />);
    expect(container.querySelector("svg")).not.toBeNull();
  });
});
