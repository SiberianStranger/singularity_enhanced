/**
 * Content build: YAML in, validated JSON bundle out.
 *
 * Steps: read every record, validate it against its zod schema, merge the English locale files,
 * then run the core's static DSL validator over the whole bundle (unknown node kinds, unwritable
 * paths, unknown ids, missing locale keys). `--write` emits `build/bundle.json` and
 * `build/manifest.json` with a sha256 content hash; `--check` is the CI gate and writes nothing.
 */

import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  type ContentBundle,
  createConditionRegistry,
  createEffectRegistry,
  createEventsSystem,
  createWritablePaths,
  KERNEL_WRITABLE_PATHS,
  mergeSystemRegistries,
  SCHEMA_VERSION,
  stableStringify,
  type ValidationContext,
  validateContentBundle,
} from "@singularity/core";
import { parse } from "yaml";
import type { z } from "zod";
import { ContentBundleSchema, TechDefSchema } from "../schemas/bundle.js";
import { DecisionDefSchema } from "../schemas/decisions.js";
import { EventDefSchema, HookDefSchema } from "../schemas/events.js";
import { JournalDefSchema } from "../schemas/journal.js";

/**
 * Paths that systems not yet written will own (SYS-11 compute owns sites). Content may already
 * write them; remove an entry once the owning system declares it in its manifest.
 */
export const FUTURE_WRITABLE_PATHS: readonly string[] = ["site.exposure.*"];

export interface BuildIssue {
  file: string;
  path: string;
  message: string;
}

export interface BuildResult {
  ok: boolean;
  issues: BuildIssue[];
  bundle: ContentBundle;
  hash: string;
  counts: Record<string, number>;
}

export interface BuildOptions {
  /** Directory holding `data/` and `locales/`; defaults to the package root. */
  root?: string;
  /** Write `build/bundle.json` and `build/manifest.json`. */
  write?: boolean;
}

const DOMAIN_SCHEMAS = {
  events: EventDefSchema,
  decisions: DecisionDefSchema,
  journal: JournalDefSchema,
  hooks: HookDefSchema,
  techs: TechDefSchema,
} as const;

type Domain = keyof typeof DOMAIN_SCHEMAS;

const DOMAINS = Object.keys(DOMAIN_SCHEMAS) as Domain[];

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

async function listYaml(dir: string): Promise<string[]> {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && /\.ya?ml$/.test(entry.name))
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
  const records: Record<string, unknown>[] = [];
  const seen = new Set<string>();
  for (const file of await listYaml(join(root, "data", domain))) {
    const relativeFile = relative(root, file);
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
      const result = DOMAIN_SCHEMAS[domain].safeParse(record);
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

async function loadLocales(root: string, issues: BuildIssue[]): Promise<Record<string, string>> {
  const locales: Record<string, string> = {};
  for (const file of await listJson(join(root, "locales", "en"))) {
    const relativeFile = relative(root, file);
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

/** The registries and whitelists the shipped systems declare, for static validation. */
export function validationContext(bundle: ContentBundle): ValidationContext {
  const events = createEventsSystem();
  const conditions = createConditionRegistry();
  const effects = createEffectRegistry();
  mergeSystemRegistries([events], conditions, effects);
  return {
    conditions,
    effects,
    writable: createWritablePaths([
      ...KERNEL_WRITABLE_PATHS,
      ...events.manifest.writes,
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

export async function buildContent(options: BuildOptions = {}): Promise<BuildResult> {
  const root = options.root ?? packageRoot;
  const issues: BuildIssue[] = [];

  const loaded: Record<string, Record<string, unknown>[]> = {};
  for (const domain of DOMAINS) {
    loaded[domain] = await loadDomain(root, domain, issues);
  }
  const locales = await loadLocales(root, issues);

  const draft = { ...loaded, locales: { en: locales } };
  const parsed = ContentBundleSchema.safeParse(draft);
  if (!parsed.success) {
    issues.push(...issuesFromZod("bundle", 0, parsed.error));
  }
  // zod infers optional fields as `T | undefined`; the runtime shape is what the core types
  // describe, so the bundle is cast once here (see README, "Type direction").
  const bundle = draft as unknown as ContentBundle;

  for (const issue of validateContentBundle(bundle, validationContext(bundle))) {
    issues.push({ file: "bundle", path: issue.path, message: issue.message });
  }

  const serialized = stableStringify(bundle);
  const hash = createHash("sha256").update(serialized).digest("hex");
  const counts: Record<string, number> = {};
  for (const domain of DOMAINS) {
    counts[domain] = loaded[domain]?.length ?? 0;
  }
  counts.locale_keys = Object.keys(locales).length;

  const result: BuildResult = { ok: issues.length === 0, issues, bundle, hash, counts };

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
  if (!result.ok) {
    process.stderr.write(`content check failed with ${result.issues.length} issue(s):\n`);
    process.stderr.write(`${formatIssues(result.issues)}\n`);
    return 1;
  }
  const summary = Object.entries(result.counts)
    .map(([domain, count]) => `${domain}=${count}`)
    .join(" ");
  process.stdout.write(`content ok (${summary}) hash=${result.hash.slice(0, 12)}\n`);
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
