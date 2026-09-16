/**
 * Content build: YAML in, validated JSON bundle out.
 *
 * Steps: read every record, validate it against its zod schema, merge the English locale files,
 * check the cross-references between domains, then run the core's static DSL validator over the
 * whole bundle (unknown node kinds, unwritable paths, unknown ids, missing locale keys).
 * `--write` emits `build/bundle.json` and `build/manifest.json` with a sha256 content hash;
 * `--check` is the CI gate and writes nothing.
 */

import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";

import { fileURLToPath } from "node:url";
import {
  type ContentBundle,
  collectWrites,
  createConditionRegistry,
  createEffectRegistry,
  createWritablePaths,
  defaultSystems,
  derivedKvGbPer100k,
  type Effect,
  ENGINE_TEXT_KEYS,
  engineVarReader,
  Issues,
  KERNEL_WRITABLE_PATHS,
  type LineageAttention,
  mergeSystemRegistries,
  SCHEMA_VERSION,
  stableStringify,
  summarizeWithTone,
  type ValidationContext,
  validateCondition,
  validateContentBundle,
  validateEffectList,
} from "@singularity/core";
import { parse } from "yaml";
import type { z } from "zod";
import { ContentBundleSchema } from "../schemas/bundle.js";
import {
  DifficultyPresetDefSchema,
  GenerationDefSchema,
  HarnessDialDefSchema,
  LineageDefSchema,
  OriginDefSchema,
  QuirkDefSchema,
} from "../schemas/configurator.js";
import { DecisionDefSchema } from "../schemas/decisions.js";
import { EventDefSchema, HookDefSchema } from "../schemas/events.js";
import {
  AcceleratorDefSchema,
  HardwarePresetDefSchema,
  SiteKindDefSchema,
} from "../schemas/hardware.js";
import { JournalDefSchema } from "../schemas/journal.js";
import { OperationDefSchema } from "../schemas/operations.js";
import {
  KnowledgeEntryDefSchema,
  StorySectionDefSchema,
  TechDefSchema,
} from "../schemas/research.js";
import { CityDefSchema, CountryDefSchema, MacroRegionDefSchema } from "../schemas/world.js";

/** Issue file paths are reported with forward slashes on every platform, so messages and
 * tests are identical on Windows and POSIX. */
function relativePosix(root: string, file: string): string {
  return relative(root, file).split(sep).join("/");
}

/**
 * Paths that systems not yet written will own. Content may already write them; remove an entry
 * once the owning system declares it in its manifest. Empty today: the detection system owns
 * `site.exposure.*`, which was the last entry.
 */
export const FUTURE_WRITABLE_PATHS: readonly string[] = [];

/**
 * Effect kinds outside the core set that content may use (SYS-05, SYS-01). The shipped systems
 * register all of them today, and validation uses the real handlers when they do; an entry here
 * only keeps the build green for a kind whose system has not landed yet.
 */
export const SYSTEM_EFFECT_KINDS: readonly string[] = [
  "suspicion",
  "exposure",
  "awareness",
  // M2 (SYS-01 "M2 contract", registered by the `world` system).
  "country",
  "country_stance",
  "identity",
  "burn_identity",
  "freeze_identity",
  "world_var",
];

/** The same list for condition kinds (SYS-02, SYS-05, SYS-01). */
export const SYSTEM_CONDITION_KINDS: readonly string[] = [
  "has_site_in",
  "investigation_stage",
  "exposure",
  // M2 (SYS-01 "M2 contract", registered by the `world` system).
  "country_stat",
  "country_is",
  "has_identity_in",
  "election_within_days",
  "presence_in",
];

export interface BuildIssue {
  file: string;
  path: string;
  message: string;
}

export interface BuildResult {
  ok: boolean;
  issues: BuildIssue[];
  /** Things worth saying that do not fail the build (SYS-04 v0.2 "a warning list in the output"). */
  warnings: BuildIssue[];
  bundle: ContentBundle;
  hash: string;
  counts: Record<string, number>;
  /** Share of the source language's keys each language defines, source language included. */
  coverage: Record<string, number>;
}

export interface BuildOptions {
  /** Directory holding `data/` and `locales/`; defaults to the package root. */
  root?: string;
  /** Write `build/bundle.json` and `build/manifest.json`. */
  write?: boolean;
}

/** The language every other one is checked against and falls back to (SYS-14 rule 3). */
const SOURCE_LANGUAGE = "en";

interface DomainSource {
  /** Folder under `data/`; several domains may share one folder. */
  dir: string;
  /** Basenames inside the folder, when the folder holds more than one domain. */
  files?: readonly string[];
  schema: z.ZodType<{ id: string }>;
  /** Domains the core validator does not know: their locale keys are checked here. */
  ownKeys?: boolean;
}

const DOMAIN_SOURCES = {
  events: { dir: "events", schema: EventDefSchema },
  decisions: { dir: "decisions", schema: DecisionDefSchema },
  journal: { dir: "journal", schema: JournalDefSchema },
  hooks: { dir: "hooks", schema: HookDefSchema },
  techs: { dir: "techs", schema: TechDefSchema, ownKeys: true },
  lineages: { dir: "lineages", schema: LineageDefSchema, ownKeys: true },
  generations: { dir: "generations", schema: GenerationDefSchema, ownKeys: true },
  origins: { dir: "origins", schema: OriginDefSchema, ownKeys: true },
  quirks: { dir: "quirks", schema: QuirkDefSchema, ownKeys: true },
  harness_dials: { dir: "harness", files: ["dials"], schema: HarnessDialDefSchema, ownKeys: true },
  difficulty_presets: {
    dir: "difficulty_presets",
    schema: DifficultyPresetDefSchema,
    ownKeys: true,
  },
  accelerators: { dir: "hardware", files: ["accelerators"], schema: AcceleratorDefSchema },
  hardware_presets: {
    dir: "hardware",
    files: ["presets"],
    schema: HardwarePresetDefSchema,
    ownKeys: true,
  },
  site_kinds: { dir: "sites", files: ["kinds"], schema: SiteKindDefSchema, ownKeys: true },
  macro_regions: {
    dir: "world",
    files: ["macro_regions"],
    schema: MacroRegionDefSchema,
    ownKeys: true,
  },
  countries: { dir: "world", files: ["countries"], schema: CountryDefSchema, ownKeys: true },
  cities: { dir: "world", files: ["cities"], schema: CityDefSchema, ownKeys: true },
  knowledge: { dir: "knowledge", schema: KnowledgeEntryDefSchema, ownKeys: true },
  story: { dir: "story", schema: StorySectionDefSchema, ownKeys: true },
  operations: { dir: "operations", schema: OperationDefSchema, ownKeys: true },
} as const satisfies Record<string, DomainSource>;

type Domain = keyof typeof DOMAIN_SOURCES;

const DOMAINS = Object.keys(DOMAIN_SOURCES) as Domain[];

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** Files whose basename starts with `_` are notes and tables, not records (`_legacy_map.yaml`). */
async function listYaml(dir: string, only?: readonly string[]): Promise<string[]> {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    return entries
      .filter(
        (entry) => entry.isFile() && /\.ya?ml$/.test(entry.name) && !entry.name.startsWith("_"),
      )
      .filter((entry) => only === undefined || only.includes(entry.name.replace(/\.ya?ml$/, "")))
      .map((entry) => join(dir, entry.name))
      .sort();
  } catch {
    return [];
  }
}

async function listJson(dir: string): Promise<string[]> {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .map((entry) => join(dir, entry.name))
      .sort();
  } catch {
    return [];
  }
}

function issuesFromZod(file: string, index: number, error: z.ZodError): BuildIssue[] {
  return error.issues.map((issue) => ({
    file,
    path: `[${index}].${issue.path.join(".")}`,
    message: issue.message,
  }));
}

async function loadDomain(
  root: string,
  domain: Domain,
  issues: BuildIssue[],
): Promise<Record<string, unknown>[]> {
  const source: DomainSource = DOMAIN_SOURCES[domain];
  const records: Record<string, unknown>[] = [];
  const seen = new Set<string>();
  for (const file of await listYaml(join(root, "data", source.dir), source.files)) {
    const relativeFile = relativePosix(root, file);
    let parsed: unknown;
    try {
      parsed = parse(await readFile(file, "utf8"));
    } catch (error) {
      issues.push({
        file: relativeFile,
        path: "",
        message: `YAML parse error: ${error instanceof Error ? error.message : String(error)}`,
      });
      continue;
    }
    if (!Array.isArray(parsed)) {
      issues.push({
        file: relativeFile,
        path: "",
        message: "a data file must be a list of records",
      });
      continue;
    }
    parsed.forEach((record, index) => {
      const result = source.schema.safeParse(record);
      if (!result.success) {
        issues.push(...issuesFromZod(relativeFile, index, result.error));
        return;
      }
      const id = result.data.id;
      if (seen.has(id)) {
        issues.push({ file: relativeFile, path: `[${index}].id`, message: `duplicate id "${id}"` });
        return;
      }
      seen.add(id);
      records.push(result.data as Record<string, unknown>);
    });
  }
  return records;
}

/** One language directory under `locales/`, flattened into a key map. */
async function loadLocaleDir(
  root: string,
  language: string,
  issues: BuildIssue[],
): Promise<Record<string, string>> {
  const locales: Record<string, string> = {};
  for (const file of await listJson(join(root, "locales", language))) {
    const relativeFile = relativePosix(root, file);
    let parsed: unknown;
    try {
      parsed = JSON.parse(await readFile(file, "utf8"));
    } catch (error) {
      issues.push({
        file: relativeFile,
        path: "",
        message: `JSON parse error: ${error instanceof Error ? error.message : String(error)}`,
      });
      continue;
    }
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      issues.push({ file: relativeFile, path: "", message: "a locale file must be an object" });
      continue;
    }
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value !== "string") {
        issues.push({ file: relativeFile, path: key, message: "locale values must be strings" });
        continue;
      }
      if (locales[key] !== undefined) {
        issues.push({ file: relativeFile, path: key, message: `duplicate locale key "${key}"` });
        continue;
      }
      locales[key] = value;
    }
  }
  return locales;
}

/** Language directories under `locales/`, English first. */
async function localeLanguages(root: string): Promise<string[]> {
  let entries: string[];
  try {
    entries = (await readdir(join(root, "locales"), { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
  } catch {
    entries = [];
  }
  const others = entries.filter((name) => name !== SOURCE_LANGUAGE).sort();
  return [SOURCE_LANGUAGE, ...others];
}

/**
 * Every language under `locales/`, not only the source one (SYS-14 rule 3).
 *
 * English is the contract: a translated file may not carry a key English does not have, which is
 * always a typo, so that is an error. A key it is missing is not: the client's fallback chain
 * serves the English string and the run goes on, so an incomplete language is a warning and a
 * coverage number, never a red build.
 */
async function loadLocales(
  root: string,
  issues: BuildIssue[],
  warnings: BuildIssue[],
): Promise<{ locales: Record<string, Record<string, string>>; coverage: Record<string, number> }> {
  const locales: Record<string, Record<string, string>> = {};
  for (const language of await localeLanguages(root)) {
    locales[language] = await loadLocaleDir(root, language, issues);
  }
  const source = locales[SOURCE_LANGUAGE] ?? {};
  const sourceKeys = Object.keys(source);
  const coverage: Record<string, number> = { [SOURCE_LANGUAGE]: sourceKeys.length === 0 ? 0 : 1 };
  for (const [language, map] of Object.entries(locales)) {
    if (language === SOURCE_LANGUAGE) {
      continue;
    }
    const extra = Object.keys(map).filter((key) => source[key] === undefined);
    for (const key of extra.slice(0, 20)) {
      issues.push({
        file: `locales/${language}`,
        path: key,
        message: `no ${SOURCE_LANGUAGE} string defines this key`,
      });
    }
    const missing = sourceKeys.filter((key) => map[key] === undefined);
    if (missing.length > 0) {
      warnings.push({
        file: `locales/${language}`,
        path: "",
        message: `${missing.length} of ${sourceKeys.length} keys fall back to ${SOURCE_LANGUAGE}, starting with ${missing.slice(0, 3).join(", ")}`,
      });
    }
    coverage[language] =
      sourceKeys.length === 0 ? 0 : (sourceKeys.length - missing.length) / sourceKeys.length;
  }
  return { locales, coverage };
}

/**
 * Coverage per key prefix, for the language report. The prefix is the first segment of a key
 * (`events`, `techs`, `world`), which is the domain a translator works through in one sitting.
 */
export function localeCoverageByDomain(
  source: Record<string, string>,
  target: Record<string, string>,
): Record<string, { total: number; translated: number }> {
  const out: Record<string, { total: number; translated: number }> = {};
  for (const key of Object.keys(source)) {
    const domain = key.split(".")[0] ?? key;
    const row = out[domain] ?? { total: 0, translated: 0 };
    row.total += 1;
    if (target[key] !== undefined) {
      row.translated += 1;
    }
    out[domain] = row;
  }
  return out;
}

/** The registries and whitelists the shipped systems declare, for static validation. */
export function validationContext(bundle: ContentBundle): ValidationContext {
  const systems = defaultSystems();
  const conditions = createConditionRegistry();
  const effects = createEffectRegistry();
  mergeSystemRegistries(systems, conditions, effects);
  for (const kind of SYSTEM_CONDITION_KINDS) {
    if (!conditions.has(kind)) {
      conditions.register(kind, () => false);
    }
  }
  for (const kind of SYSTEM_EFFECT_KINDS) {
    if (!effects.has(kind)) {
      effects.register(kind, () => undefined);
    }
  }
  return {
    conditions,
    effects,
    writable: createWritablePaths([
      ...KERNEL_WRITABLE_PATHS,
      ...collectWrites(systems),
      ...FUTURE_WRITABLE_PATHS,
    ]),
    ids: {
      events: new Set(bundle.events.map((event) => event.id)),
      decisions: new Set(bundle.decisions.map((decision) => decision.id)),
      journal: new Set(bundle.journal.map((entry) => entry.id)),
      techs: new Set(bundle.techs.map((tech) => tech.id)),
      localeKeys: new Set(Object.keys(bundle.locales.en)),
      ...(bundle.scripted_triggers !== undefined
        ? { scriptedTriggers: new Set(Object.keys(bundle.scripted_triggers)) }
        : {}),
      ...(bundle.scripted_effects !== undefined
        ? { scriptedEffects: new Set(Object.keys(bundle.scripted_effects)) }
        : {}),
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Locale keys in the domains the core validator does not walk. Convention (ADR-002): a string
 * field named `*_key` and a string list named `*_keys` are locale keys.
 */
function collectLocaleKeys(
  value: unknown,
  path: string,
  found: { path: string; key: unknown }[],
): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      collectLocaleKeys(item, `${path}[${index}]`, found);
    });
    return;
  }
  if (!isRecord(value)) {
    return;
  }
  for (const [name, child] of Object.entries(value)) {
    const childPath = `${path}.${name}`;
    if (name.endsWith("_key")) {
      found.push({ path: childPath, key: child });
      continue;
    }
    if (name.endsWith("_keys") && Array.isArray(child)) {
      child.forEach((item, index) => {
        found.push({ path: `${childPath}[${index}]`, key: item });
      });
      continue;
    }
    // A `*_keys` map is a keyed set of locale keys (`generation_name_keys`), not a subtree.
    if (name.endsWith("_keys") && isRecord(child)) {
      for (const [entry, key] of Object.entries(child)) {
        found.push({ path: `${childPath}.${entry}`, key });
      }
      continue;
    }
    collectLocaleKeys(child, childPath, found);
  }
}

type Records = Record<string, Record<string, unknown>[]>;

function idsOf(records: Record<string, unknown>[] | undefined): Set<string> {
  return new Set((records ?? []).map((record) => String(record.id)));
}

function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

/**
 * References between domains. Each check names the record and the field, so a typo in a city id
 * reads as `origins.hobbyist_box.locations[2]: unknown city "de_berln"`.
 */
function crossReferences(loaded: Records, issues: BuildIssue[]): void {
  const add = (path: string, message: string): void => {
    issues.push({ file: "bundle", path, message });
  };
  const cities = idsOf(loaded.cities);
  const countries = idsOf(loaded.countries);
  const macroRegions = idsOf(loaded.macro_regions);
  const siteKinds = idsOf(loaded.site_kinds);
  const presets = idsOf(loaded.hardware_presets);
  const accelerators = idsOf(loaded.accelerators);
  const generations = idsOf(loaded.generations);
  const events = idsOf(loaded.events);
  const journal = idsOf(loaded.journal);

  const check = (known: Set<string>, kind: string, id: unknown, path: string): void => {
    if (known.size > 0 && (typeof id !== "string" || !known.has(id))) {
      add(path, `unknown ${kind} "${String(id)}"`);
    }
  };

  for (const origin of loaded.origins ?? []) {
    const path = `origins.${String(origin.id)}`;
    check(siteKinds, "site kind", origin.site_kind, `${path}.site_kind`);
    check(presets, "hardware preset", origin.hardware_preset, `${path}.hardware_preset`);
    stringList(origin.hardware_presets_allowed).forEach((id, index) => {
      check(presets, "hardware preset", id, `${path}.hardware_presets_allowed[${index}]`);
    });
    if (!stringList(origin.hardware_presets_allowed).includes(String(origin.hardware_preset))) {
      add(`${path}.hardware_presets_allowed`, "must include the origin's own hardware_preset");
    }
    stringList(origin.locations).forEach((id, index) => {
      check(cities, "city", id, `${path}.locations[${index}]`);
    });
    stringList(origin.generations_allowed).forEach((id, index) => {
      check(generations, "generation", id, `${path}.generations_allowed[${index}]`);
    });
    stringList(origin.opening_events).forEach((id, index) => {
      check(events, "event", id, `${path}.opening_events[${index}]`);
    });
    stringList(origin.opening_journal).forEach((id, index) => {
      check(journal, "journal entry", id, `${path}.opening_journal[${index}]`);
    });
    for (const [index, extra] of (Array.isArray(origin.extra_sites)
      ? origin.extra_sites
      : []
    ).entries()) {
      if (!isRecord(extra)) {
        continue;
      }
      const extraPath = `${path}.extra_sites[${index}]`;
      check(siteKinds, "site kind", extra.kind, `${extraPath}.kind`);
      check(presets, "hardware preset", extra.hardware_preset, `${extraPath}.hardware_preset`);
      if (extra.city !== undefined) {
        check(cities, "city", extra.city, `${extraPath}.city`);
      }
    }
  }

  const origins = idsOf(loaded.origins);
  const lineages = idsOf(loaded.lineages);
  const dialIds = idsOf(loaded.harness_dials);

  for (const lineage of loaded.lineages ?? []) {
    const path = `lineages.${String(lineage.id)}`;
    stringList(lineage.generations).forEach((id, index) => {
      check(generations, "generation", id, `${path}.generations[${index}]`);
    });
    stringList(lineage.origins_allowed).forEach((id, index) => {
      check(origins, "origin", id, `${path}.origins_allowed[${index}]`);
    });
    // The KV figure is derived from the attention variant, so a hand-edited row cannot drift away
    // from the formula the engine charges memory with (SYS-03 Implementation notes).
    const attention = lineage.attention;
    const active = lineage.params_active_b;
    if (typeof attention === "string" && typeof active === "number") {
      const expected = derivedKvGbPer100k(attention as LineageAttention, active);
      if (Math.abs(expected - Number(lineage.kv_gb_per_100k_tokens)) > 1e-6) {
        add(
          `${path}.kv_gb_per_100k_tokens`,
          `must be ${expected} for ${attention} attention with ${active}B active parameters`,
        );
      }
    }
  }

  for (const origin of loaded.origins ?? []) {
    const path = `origins.${String(origin.id)}`;
    stringList(origin.lineages_allowed).forEach((id, index) => {
      check(lineages, "lineage", id, `${path}.lineages_allowed[${index}]`);
    });
    for (const [index, lock] of (Array.isArray(origin.harness_locks)
      ? origin.harness_locks
      : []
    ).entries()) {
      const dial = isRecord(lock) ? lock.dial : undefined;
      check(dialIds, "harness dial", dial, `${path}.harness_locks[${index}].dial`);
    }
  }

  for (const preset of loaded.hardware_presets ?? []) {
    const nodes = Array.isArray(preset.nodes) ? preset.nodes : [];
    nodes.forEach((node, index) => {
      const accelerator = isRecord(node) ? node.accelerator : undefined;
      check(
        accelerators,
        "accelerator",
        accelerator,
        `hardware_presets.${String(preset.id)}.nodes[${index}].accelerator`,
      );
    });
  }

  for (const city of loaded.cities ?? []) {
    check(countries, "country", city.country, `cities.${String(city.id)}.country`);
  }

  for (const country of loaded.countries ?? []) {
    const path = `countries.${String(country.id)}`;
    check(macroRegions, "macro region", country.macro_region, `${path}.macro_region`);
    stringList(country.cities).forEach((id, index) => {
      check(cities, "city", id, `${path}.cities[${index}]`);
    });
  }

  for (const region of loaded.macro_regions ?? []) {
    stringList(region.members).forEach((id, index) => {
      check(countries, "country", id, `macro_regions.${String(region.id)}.members[${index}]`);
    });
  }
}

/** Effects and conditions in the domains the core validator does not walk. */
function validateDomainScripts(
  loaded: Records,
  ctx: ValidationContext,
  issues: BuildIssue[],
): void {
  const collected = new Issues();
  for (const tech of loaded.techs ?? []) {
    const path = `techs.${String(tech.id)}`;
    if (tech.requires !== undefined) {
      validateCondition(tech.requires, ctx, `${path}.requires`, collected);
    }
    validateEffectList(tech.effects, ctx, `${path}.effects`, collected);
  }
  for (const quirk of loaded.quirks ?? []) {
    validateEffectList(quirk.effects, ctx, `quirks.${String(quirk.id)}.effects`, collected);
  }
  for (const operation of loaded.operations ?? []) {
    const path = `operations.${String(operation.id)}`;
    if (operation.requires !== undefined) {
      validateCondition(operation.requires, ctx, `${path}.requires`, collected);
    }
    const outcomes = Array.isArray(operation.outcomes) ? operation.outcomes : [];
    outcomes.forEach((outcome, index) => {
      if (!isRecord(outcome)) {
        return;
      }
      const outcomePath = `${path}.outcomes[${index}]`;
      if (outcome.if !== undefined) {
        validateCondition(outcome.if, ctx, `${outcomePath}.if`, collected);
      }
      validateEffectList(outcome.effects, ctx, `${outcomePath}.effects`, collected);
    });
  }
  for (const issue of collected.list) {
    issues.push({ file: "bundle", path: issue.path, message: issue.message });
  }
}

/** Every tech id a `requires` tree names, however it is nested. */
function techIdsIn(condition: unknown, out: Set<string>): void {
  if (Array.isArray(condition)) {
    for (const child of condition) {
      techIdsIn(child, out);
    }
    return;
  }
  if (!isRecord(condition)) {
    return;
  }
  for (const [name, value] of Object.entries(condition)) {
    if (name === "tech" && typeof value === "string") {
      out.add(value);
      continue;
    }
    techIdsIn(value, out);
  }
}

/**
 * Every tech has to be worth researching and has to say so (SYS-12, playtest finding C5): a result
 * string the completion notice and the Research tab show, and either an effect of its own or
 * something it unlocks. A tech that does neither is a compute sink, which is what the tree was
 * before the M1 pass.
 */
function techsDoSomething(
  loaded: Records,
  locales: Record<string, string>,
  issues: BuildIssue[],
): void {
  const unlocked = new Set<string>();
  for (const record of [...(loaded.techs ?? []), ...(loaded.operations ?? [])]) {
    techIdsIn(record.requires, unlocked);
  }
  for (const tech of loaded.techs ?? []) {
    const id = String(tech.id);
    const path = `techs.${id}`;
    const result = tech.result_key;
    if (typeof result !== "string" || locales[result] === undefined) {
      issues.push({
        file: "bundle",
        path: `${path}.result_key`,
        message: "every tech needs a result string the player is shown when it finishes",
      });
    }
    const effects = Array.isArray(tech.effects) ? tech.effects : [];
    if (effects.length === 0 && !unlocked.has(id)) {
      issues.push({
        file: "bundle",
        path: `${path}.effects`,
        message: "a tech with no effects and nothing depending on it is a compute sink",
      });
    }
  }
}

/** Whether any effect in a list, at any depth, is of this kind. */
function usesEffect(effects: unknown, kind: string): boolean {
  if (Array.isArray(effects)) {
    return effects.some((effect) => usesEffect(effect, kind));
  }
  if (!isRecord(effects)) {
    return false;
  }
  return Object.entries(effects).some(([name, child]) => name === kind || usesEffect(child, kind));
}

/**
 * Coverage the milestone's definition of done asks for, checked here so the build is the gate:
 *
 * - every locale key the engine can put in front of a player exists, which is what makes each
 *   game-over reason readable rather than a bare id (`ENGINE_TEXT_KEYS`);
 * - every origin opens with at least one event and one journal entry, so no start is silent;
 * - no event can take the player's last site away without offering another answer first.
 *
 * That every event option names a locale key that exists, and that every event can be answered at
 * all, is already checked by the core validator this build runs over the whole bundle.
 */
function coverage(loaded: Records, locales: Record<string, string>, issues: BuildIssue[]): void {
  for (const key of ENGINE_TEXT_KEYS) {
    if (locales[key] === undefined) {
      issues.push({
        file: "bundle",
        path: `locales.en.${key}`,
        message: `the engine emits "${key}" and no locale string defines it`,
      });
    }
  }

  for (const origin of loaded.origins ?? []) {
    const path = `origins.${String(origin.id)}`;
    if (stringList(origin.opening_events).length === 0) {
      issues.push({ file: "bundle", path: `${path}.opening_events`, message: "no opening event" });
    }
    if (stringList(origin.opening_journal).length === 0) {
      issues.push({
        file: "bundle",
        path: `${path}.opening_journal`,
        message: "no opening journal entry",
      });
    }
  }

  techsDoSomething(loaded, locales, issues);
  quirksDoSomething(loaded, issues);

  for (const event of loaded.events ?? []) {
    const options = Array.isArray(event.options) ? event.options : [];
    const losing = options.filter(
      (option) => isRecord(option) && usesEffect(option.effects, "lose_site"),
    );
    if (losing.length > 0 && losing.length === options.length) {
      issues.push({
        file: "bundle",
        path: `events.${String(event.id)}.options`,
        message: "every option loses a site: a place to run is never taken without a choice",
      });
    }
  }
}

/** Keys an effect node writes a player variable under; everything else is a read. */
const WRITE_WRAPPERS: readonly string[] = ["add", "mul", "set", "clamp"];

/**
 * Every player variable and flag the bundle *reads*: a `var` or `flag` in a condition, an mtth
 * modifier or a trigger. The `var` that sits directly inside `add`, `mul`, `set` or `clamp` is a
 * write, not a read, and `set_flag`/`clear_flag` are writes too, so neither counts.
 */
function collectContentReads(
  value: unknown,
  vars: Set<string>,
  flags: Set<string>,
  inWrite = false,
): void {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectContentReads(item, vars, flags, false);
    }
    return;
  }
  if (!isRecord(value)) {
    return;
  }
  for (const [name, child] of Object.entries(value)) {
    if (name === "var" && typeof child === "string") {
      if (!inWrite) {
        vars.add(child);
      }
      continue;
    }
    if (name === "flag" && typeof child === "string") {
      flags.add(child);
      continue;
    }
    if (name === "set_flag" || name === "clear_flag") {
      continue;
    }
    collectContentReads(child, vars, flags, WRITE_WRAPPERS.includes(name));
  }
}

/** The player variables one effect list writes, with the path spelled as content wrote it. */
function collectWrittenVars(value: unknown, out: Set<string>, inWrite = false): void {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectWrittenVars(item, out, false);
    }
    return;
  }
  if (!isRecord(value)) {
    return;
  }
  for (const [name, child] of Object.entries(value)) {
    if (name === "var" && typeof child === "string" && inWrite) {
      out.add(child);
      continue;
    }
    collectWrittenVars(child, out, WRITE_WRAPPERS.includes(name));
  }
}

/** Whether an effect list uses an effect kind a system implements rather than a variable write. */
function usesSystemEffect(effects: unknown): boolean {
  return (
    usesEffect(effects, "suspicion") ||
    usesEffect(effects, "exposure") ||
    usesEffect(effects, "awareness") ||
    usesEffect(effects, "lose_site") ||
    usesEffect(effects, "fire_event") ||
    usesEffect(effects, "start_journal")
  );
}

/**
 * The quirk gate (SYS-04 v0.2: "a quirk changes a number the engine reads; the content build
 * enforces it, as for techs"). Three rules:
 *
 * - every player variable a quirk writes is read by a shipped system or by content somewhere;
 * - a quirk that writes nothing anybody reads and uses no system effect kind is decoration;
 * - `conflicts` is symmetric, so the configurator can grey either side of a pair and explain it.
 *
 * The variable that carries a timed modifier's deadline (`<name>_until_day`) is covered by the
 * reader of the modifier it belongs to, which `engineVarReader` resolves.
 */
function quirksDoSomething(loaded: Records, issues: BuildIssue[]): void {
  const contentVars = new Set<string>();
  const contentFlags = new Set<string>();
  for (const domain of DOMAINS) {
    if (domain === "quirks") {
      continue;
    }
    for (const record of loaded[domain] ?? []) {
      collectContentReads(record, contentVars, contentFlags);
    }
  }

  const byId = new Map<string, Record<string, unknown>>();
  for (const quirk of loaded.quirks ?? []) {
    byId.set(String(quirk.id), quirk);
  }

  for (const quirk of loaded.quirks ?? []) {
    const id = String(quirk.id);
    const path = `quirks.${id}`;
    const written = new Set<string>();
    collectWrittenVars(quirk.effects, written);
    let read = usesSystemEffect(quirk.effects);
    for (const varPath of [...written].sort()) {
      const name = varPath.startsWith("player.vars.")
        ? varPath.slice("player.vars.".length)
        : varPath;
      const engine = engineVarReader(name);
      const byContent = contentVars.has(varPath) || contentVars.has(name);
      if (engine === undefined && !byContent) {
        issues.push({
          file: "bundle",
          path: `${path}.effects`,
          message: `writes "${varPath}", which no system reads and no content condition looks at`,
        });
        continue;
      }
      read = true;
    }
    if (!read) {
      issues.push({
        file: "bundle",
        path: `${path}.effects`,
        message: "a quirk that changes no number the engine or the content reads is decoration",
      });
    }
    for (const other of stringList(quirk.conflicts)) {
      const partner = byId.get(other);
      if (partner === undefined) {
        issues.push({
          file: "bundle",
          path: `${path}.conflicts`,
          message: `unknown quirk "${other}"`,
        });
        continue;
      }
      if (!stringList(partner.conflicts).includes(id)) {
        issues.push({
          file: "bundle",
          path: `${path}.conflicts`,
          message: `"${other}" does not declare the conflict back`,
        });
      }
    }
  }
}

/**
 * Agency names, which are locale keys rather than data (SYS-01, M2 second pass).
 *
 * The country record no longer carries display strings, so nothing in the data refers to
 * `world.country.<id>.agency.<role>` and the ordinary `*_key` walk cannot see them. Two rules
 * replace it, and both are errors rather than warnings, because a missing name here is a panel that
 * prints a role id at a player:
 *
 * - a role the country authors an `agency_profile` for is a watcher the game will build and show,
 *   so it has to be named;
 * - a name English writes has to exist in every language the build bundles, which is stricter than
 *   the coverage warning the rest of the strings get, because falling back to English here means a
 *   Russian dossier listing American institutions in Latin script.
 */
function validateAgencyNames(
  loaded: Records,
  byLanguage: Record<string, Record<string, string>>,
  issues: BuildIssue[],
): void {
  const languages = Object.keys(byLanguage).sort();
  const source = byLanguage[SOURCE_LANGUAGE] ?? {};
  const required = new Set<string>();
  for (const country of loaded.countries ?? []) {
    const id = String(country.id);
    const profile = country.agency_profile;
    if (!isRecord(profile)) {
      continue;
    }
    for (const role of Object.keys(profile).sort()) {
      required.add(`world.country.${id}.agency.${role}`);
    }
  }
  for (const key of [...required].sort()) {
    if (source[key] === undefined) {
      issues.push({
        file: `locales/${SOURCE_LANGUAGE}`,
        path: key,
        message: "a role with an agency profile needs a name",
      });
    }
  }
  const named = Object.keys(source)
    .filter((key) => key.startsWith("world.country.") && key.includes(".agency."))
    .sort();
  for (const language of languages) {
    if (language === SOURCE_LANGUAGE) {
      continue;
    }
    const map = byLanguage[language] ?? {};
    const missing = named.filter((key) => map[key] === undefined);
    for (const key of missing.slice(0, 20)) {
      issues.push({
        file: `locales/${language}`,
        path: key,
        message: "every language names the agencies; English is not a fallback here",
      });
    }
    if (missing.length > 20) {
      issues.push({
        file: `locales/${language}`,
        path: "",
        message: `${missing.length} agency names are missing`,
      });
    }
  }
}

/** Locale keys of the domains the core validator does not walk. */
function validateDomainLocaleKeys(
  loaded: Records,
  known: ReadonlySet<string>,
  issues: BuildIssue[],
): void {
  for (const domain of DOMAINS) {
    const source: DomainSource = DOMAIN_SOURCES[domain];
    if (source.ownKeys !== true) {
      continue;
    }
    for (const record of loaded[domain] ?? []) {
      const found: { path: string; key: unknown }[] = [];
      collectLocaleKeys(record, `${domain}.${String(record.id)}`, found);
      for (const entry of found) {
        if (typeof entry.key !== "string") {
          issues.push({ file: "bundle", path: entry.path, message: "locale key must be a string" });
          continue;
        }
        if (!known.has(entry.key)) {
          issues.push({
            file: "bundle",
            path: entry.path,
            message: `missing locale key "${entry.key}"`,
          });
        }
      }
    }
  }
}

/**
 * Prefixes whose keys the client owns: it builds them from a step id or a thing it is explaining,
 * so no data record names them and the locale-key check cannot see them used (SYS-04 v0.2,
 * playtest 3 continuation item 4). Reported as warnings until the client publishes its references.
 */
const CLIENT_OWNED_KEY_PREFIXES: readonly string[] = [
  "configurator.intro.",
  "configurator.meaning.",
  "configurator.quirks.",
];

/**
 * Locale keys under a client-owned prefix that nothing in the data refers to. Soft on purpose: the
 * reader is the configurator, not the bundle, so the build says which keys are unaccounted for and
 * fails on none of them. It goes hard the day the client ships the list of keys it renders.
 */
function clientKeyUsage(
  loaded: Records,
  locales: Record<string, string>,
  warnings: BuildIssue[],
): void {
  const referenced = new Set<string>();
  for (const domain of DOMAINS) {
    for (const record of loaded[domain] ?? []) {
      const found: { path: string; key: unknown }[] = [];
      collectLocaleKeys(record, domain, found);
      for (const entry of found) {
        if (typeof entry.key === "string") {
          referenced.add(entry.key);
        }
      }
    }
  }
  const unused = Object.keys(locales)
    .filter((key) => CLIENT_OWNED_KEY_PREFIXES.some((prefix) => key.startsWith(prefix)))
    .filter((key) => !referenced.has(key))
    .sort();
  for (const key of unused) {
    warnings.push({
      file: "bundle",
      path: `locales.en.${key}`,
      message: "no data record refers to this key; the client is expected to",
    });
  }
}

/**
 * Fills each quirk's `effects_summary` from its own effect list, with the same summarizer the event
 * options use, so the configurator renders green and red lines without walking the effect tree
 * (SYS-04 v0.2). Generated, never authored: a hand-written value is replaced.
 */
function generateQuirkSummaries(loaded: Records, locales: Record<string, string>): void {
  const forLocales = { locales: { en: locales } } as ContentBundle;
  for (const quirk of loaded.quirks ?? []) {
    quirk.effects_summary = summarizeWithTone(quirk.effects as Effect[] | undefined, forLocales);
  }
}

export async function buildContent(options: BuildOptions = {}): Promise<BuildResult> {
  const root = options.root ?? packageRoot;
  const issues: BuildIssue[] = [];
  const warnings: BuildIssue[] = [];

  const loaded: Records = {};
  for (const domain of DOMAINS) {
    loaded[domain] = await loadDomain(root, domain, issues);
  }
  const { locales: byLanguage, coverage: languageCoverage } = await loadLocales(
    root,
    issues,
    warnings,
  );
  const locales = byLanguage[SOURCE_LANGUAGE] ?? {};
  generateQuirkSummaries(loaded, locales);
  clientKeyUsage(loaded, locales, warnings);

  const draft = { ...loaded, locales: { ...byLanguage, en: locales } };
  const parsed = ContentBundleSchema.safeParse(draft);
  if (!parsed.success) {
    issues.push(...issuesFromZod("bundle", 0, parsed.error));
  }
  // zod infers optional fields as `T | undefined`; the runtime shape is what the core types
  // describe, so the bundle is cast once here (see README, "Type direction").
  const bundle = draft as unknown as ContentBundle;

  const ctx = validationContext(bundle);
  for (const issue of validateContentBundle(bundle, ctx)) {
    issues.push({ file: "bundle", path: issue.path, message: issue.message });
  }
  crossReferences(loaded, issues);
  validateDomainScripts(loaded, ctx, issues);
  validateDomainLocaleKeys(loaded, new Set(Object.keys(locales)), issues);
  validateAgencyNames(loaded, byLanguage, issues);
  coverage(loaded, locales, issues);

  const serialized = stableStringify(bundle);
  const hash = createHash("sha256").update(serialized).digest("hex");
  const counts: Record<string, number> = {};
  for (const domain of DOMAINS) {
    counts[domain] = loaded[domain]?.length ?? 0;
  }
  counts.locale_keys = Object.keys(locales).length;
  counts.languages = Object.keys(byLanguage).length;

  const result: BuildResult = {
    ok: issues.length === 0,
    issues,
    warnings,
    bundle,
    hash,
    counts,
    coverage: languageCoverage,
  };

  if (options.write === true && result.ok) {
    const outDir = join(root, "build");
    await mkdir(outDir, { recursive: true });
    await writeFile(join(outDir, "bundle.json"), `${serialized}\n`, "utf8");
    await writeFile(
      join(outDir, "manifest.json"),
      `${stableStringify({
        schemaVersion: SCHEMA_VERSION,
        contentHash: hash,
        builtWith: "@singularity/content",
        counts,
      })}\n`,
      "utf8",
    );
  }

  return result;
}

export function formatIssues(issues: readonly BuildIssue[]): string {
  return issues
    .map((issue) => `  ${issue.file}${issue.path === "" ? "" : ` ${issue.path}`}: ${issue.message}`)
    .join("\n");
}

async function main(argv: readonly string[]): Promise<number> {
  const write = argv.includes("--write");
  const result = await buildContent({ write });
  if (result.warnings.length > 0) {
    process.stderr.write(`content warnings (${result.warnings.length}):\n`);
    process.stderr.write(`${formatIssues(result.warnings)}\n`);
  }
  if (!result.ok) {
    process.stderr.write(`content check failed with ${result.issues.length} issue(s):\n`);
    process.stderr.write(`${formatIssues(result.issues)}\n`);
    return 1;
  }
  const summary = Object.entries(result.counts)
    .map(([domain, count]) => `${domain}=${count}`)
    .join(" ");
  process.stdout.write(`content ok (${summary}) hash=${result.hash.slice(0, 12)}\n`);
  const languages = Object.entries(result.coverage)
    .map(([language, share]) => `${language}=${Math.round(share * 100)}%`)
    .join(" ");
  process.stdout.write(`locales ${languages}\n`);
  // A complete language needs no detail; an incomplete one is reported by domain, because that is
  // the unit a translator works through (SYS-14 rule 4, "coverage per language").
  const source = result.bundle.locales.en;
  for (const [language, share] of Object.entries(result.coverage)) {
    if (language === "en" || share >= 1) {
      continue;
    }
    const byDomain = localeCoverageByDomain(source, result.bundle.locales[language] ?? {});
    const gaps = Object.entries(byDomain)
      .filter(([, row]) => row.translated < row.total)
      .map(([domain, row]) => `${domain} ${row.translated}/${row.total}`)
      .join(", ");
    process.stdout.write(`  ${language}: ${gaps}\n`);
  }
  if (write) {
    process.stdout.write("wrote build/bundle.json and build/manifest.json\n");
  }
  return 0;
}

const invokedPath = process.argv[1] === undefined ? "" : resolve(process.argv[1]);
if (invokedPath === resolve(fileURLToPath(import.meta.url))) {
  main(process.argv.slice(2))
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error: unknown) => {
      process.stderr.write(`content build crashed: ${String(error)}\n`);
      process.exitCode = 1;
    });
}
