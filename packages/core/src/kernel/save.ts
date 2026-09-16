/**
 * Save and load.
 *
 * A save is the JSON of `World` with a stable key order, so two identical worlds produce identical
 * strings (that is what the determinism tests compare). Older saves are upgraded by a migration
 * chain; newer saves are rejected with a typed error instead of being loaded half-understood.
 */

import { SCHEMA_VERSION, type World } from "./world.js";

export class SaveError extends Error {
  readonly code: string;

  constructor(message: string, code = "save_error") {
    super(message);
    this.name = "SaveError";
    this.code = code;
  }
}

export class SaveVersionError extends SaveError {
  readonly fromVersion: number;
  readonly currentVersion: number;

  constructor(fromVersion: number, currentVersion: number) {
    super(
      `save schema version ${fromVersion} is newer than the supported version ${currentVersion}`,
      "save_version_too_new",
    );
    this.name = "SaveVersionError";
    this.fromVersion = fromVersion;
    this.currentVersion = currentVersion;
  }
}

export class SaveMigrationError extends SaveError {
  constructor(message: string) {
    super(message, "save_migration_failed");
    this.name = "SaveMigrationError";
  }
}

export interface Migration {
  from: number;
  to: number;
  migrate(save: Record<string, unknown>): Record<string, unknown>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** JSON with object keys in sorted order; arrays keep their order. */
export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item === undefined ? null : item)).join(",")}]`;
  }
  if (isRecord(value)) {
    const parts: string[] = [];
    for (const key of Object.keys(value).sort()) {
      const entry = value[key];
      if (entry === undefined) {
        continue;
      }
      parts.push(`${JSON.stringify(key)}:${stableStringify(entry)}`);
    }
    return `{${parts.join(",")}}`;
  }
  if (typeof value === "number" && !Number.isFinite(value)) {
    throw new SaveError(`cannot serialize non-finite number ${value}`, "save_bad_number");
  }
  return JSON.stringify(value ?? null);
}

export function serialize(world: World): string {
  return stableStringify(world);
}

function schemaVersionOf(save: Record<string, unknown>): number {
  const meta = save.meta;
  if (!isRecord(meta) || typeof meta.schemaVersion !== "number") {
    throw new SaveError("save has no meta.schemaVersion", "save_malformed");
  }
  return meta.schemaVersion;
}

const REQUIRED_KEYS = [
  "meta",
  "clock",
  "rng",
  "players",
  "playerOrder",
  "entities",
  "events",
  "journal",
  "decisions",
  "flags",
  "log",
  "notifications",
] as const;

function assertWorldShape(save: Record<string, unknown>): void {
  for (const key of REQUIRED_KEYS) {
    if (save[key] === undefined) {
      throw new SaveError(`save is missing "${key}"`, "save_malformed");
    }
  }
}

/** Applies the migration chain in order and returns the upgraded world. */
export function deserialize(json: string, migrations: readonly Migration[] = []): World {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (error) {
    throw new SaveError(
      `save is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
      "save_malformed",
    );
  }
  if (!isRecord(parsed)) {
    throw new SaveError("save must be a JSON object", "save_malformed");
  }

  let save = parsed;
  let version = schemaVersionOf(save);
  if (version > SCHEMA_VERSION) {
    throw new SaveVersionError(version, SCHEMA_VERSION);
  }

  const chain = [...migrations].sort((a, b) => a.from - b.from);
  const applied = new Set<number>();
  while (version < SCHEMA_VERSION) {
    const migration = chain.find((candidate) => candidate.from === version);
    if (migration === undefined) {
      throw new SaveMigrationError(`no migration from schema version ${version}`);
    }
    if (migration.to <= migration.from || applied.has(migration.from)) {
      throw new SaveMigrationError(
        `migration ${migration.from} -> ${migration.to} does not move forward`,
      );
    }
    applied.add(migration.from);
    const migrated = migration.migrate(save);
    if (!isRecord(migrated)) {
      throw new SaveMigrationError(
        `migration ${migration.from} -> ${migration.to} returned no object`,
      );
    }
    save = migrated;
    const meta = save.meta;
    if (isRecord(meta)) {
      meta.schemaVersion = migration.to;
    }
    version = migration.to;
  }

  assertWorldShape(save);
  // The shape has been checked above; content beyond that is the responsibility of the migrations.
  return save as unknown as World;
}
