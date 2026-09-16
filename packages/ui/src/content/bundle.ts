/**
 * The compiled content bundle.
 *
 * `@content/bundle` is a Vite alias for `packages/content/build/bundle.json`, written by
 * `pnpm content:build` (the `predev`/`prebuild`/`pretest` scripts run it). The bundle is JSON, so
 * it arrives untyped; this module is the only place that narrows it, fills the domains an
 * in-progress bundle may not carry yet, and hands the rest of the client a `ContentBundle`.
 */

import raw from "@content/bundle";
import { type ContentBundle, EMPTY_CONTENT } from "@singularity/core";

function array<T>(value: unknown): readonly T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function locales(value: unknown): ContentBundle["locales"] {
  if (typeof value !== "object" || value === null) {
    return { en: {} };
  }
  const entries = Object.entries(value as Record<string, unknown>).filter(
    (entry): entry is [string, Record<string, string>] =>
      typeof entry[1] === "object" && entry[1] !== null,
  );
  return { en: {}, ...Object.fromEntries(entries) };
}

/** Narrows the loaded JSON; a bundle missing a domain reads as an empty domain, never a crash. */
export function toContentBundle(value: unknown): ContentBundle {
  if (typeof value !== "object" || value === null) {
    return EMPTY_CONTENT;
  }
  const source = value as Record<string, unknown>;
  const optional = [
    "lineages",
    "generations",
    "origins",
    "quirks",
    "difficulty_presets",
    "accelerators",
    "hardware_presets",
    "site_kinds",
    "macro_regions",
    "countries",
    "cities",
    "knowledge",
    "story",
    "operations",
  ] as const;
  const bundle: Record<string, unknown> = {
    events: array(source.events),
    decisions: array(source.decisions),
    journal: array(source.journal),
    hooks: array(source.hooks),
    techs: array(source.techs),
    locales: locales(source.locales),
  };
  for (const domain of optional) {
    const records = array(source[domain]);
    if (records.length > 0) {
      bundle[domain] = records;
    }
  }
  return bundle as unknown as ContentBundle;
}

export const contentBundle: ContentBundle = toContentBundle(raw);
