/**
 * Dotted-path reads and writes against a scope object, with a writable-path whitelist.
 *
 * Reads never throw: a missing path yields `undefined`. Writes outside the whitelist throw a
 * `DslError` both in `validate.ts` (at content build time) and here (at runtime), which is what
 * turns a typo in a content file into a CI failure instead of a silent no-op.
 */

export class DslError extends Error {
  readonly code: string;

  constructor(message: string, code = "dsl_error") {
    super(message);
    this.name = "DslError";
    this.code = code;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Splits "a.b.c" into its segments, rejecting empty segments. */
export function splitPath(path: string): string[] {
  const segments = path.split(".");
  if (segments.length === 0 || segments.some((segment) => segment.length === 0)) {
    throw new DslError(`invalid path "${path}"`, "dsl_invalid_path");
  }
  return segments;
}

/**
 * Matches a path against a pattern where `*` stands for one segment and `**` for one or more
 * trailing segments: `player.vars.*` matches `player.vars.cash_rate` but not `player.vars.a.b`.
 */
export function matchPathPattern(pattern: string, path: string): boolean {
  const patternSegments = pattern.split(".");
  const pathSegments = path.split(".");
  for (let i = 0; i < patternSegments.length; i += 1) {
    const expected = patternSegments[i];
    if (expected === "**") {
      return pathSegments.length > i;
    }
    const actual = pathSegments[i];
    if (actual === undefined) {
      return false;
    }
    if (expected !== "*" && expected !== actual) {
      return false;
    }
  }
  return pathSegments.length === patternSegments.length;
}

export interface WritablePaths {
  allows(path: string): boolean;
  patterns(): readonly string[];
  /** Returns a new whitelist with extra patterns (systems contribute their `manifest.writes`). */
  with(extra: readonly string[]): WritablePaths;
}

export function createWritablePaths(patterns: readonly string[]): WritablePaths {
  const sorted = [...new Set(patterns)].sort();
  return {
    allows(path: string): boolean {
      return sorted.some((pattern) => matchPathPattern(pattern, path));
    },
    patterns(): readonly string[] {
      return sorted;
    },
    with(extra: readonly string[]): WritablePaths {
      return createWritablePaths([...sorted, ...extra]);
    },
  };
}

/** Paths the kernel itself owns; systems add their own through `manifest.writes`. */
export const KERNEL_WRITABLE_PATHS: readonly string[] = [
  "player.cash",
  "player.flags.*",
  "player.vars.*",
  "player.suspicion.*",
  "world.vars.*",
  "world.flags.*",
];

/** Reads a dotted path; missing or non-object intermediates yield `undefined`. */
export function getPath(scope: unknown, path: string): unknown {
  let current: unknown = scope;
  for (const segment of splitPath(path)) {
    if (!isRecord(current)) {
      return undefined;
    }
    current = current[segment];
  }
  return current;
}

export function assertWritable(path: string, writable: WritablePaths): void {
  if (!writable.allows(path)) {
    throw new DslError(`path "${path}" is not writable`, "dsl_unwritable_path");
  }
}

/**
 * Writes a dotted path. Missing intermediate objects are created, which is what makes
 * `player.vars.new_counter` work without declaring it first.
 */
export function setPath(
  scope: unknown,
  path: string,
  value: unknown,
  writable: WritablePaths,
): void {
  assertWritable(path, writable);
  const segments = splitPath(path);
  const last = segments[segments.length - 1] as string;
  let current: unknown = scope;
  for (const segment of segments.slice(0, -1)) {
    if (!isRecord(current)) {
      throw new DslError(`cannot write "${path}": "${segment}" is not an object`, "dsl_bad_scope");
    }
    const next = current[segment];
    if (next === undefined || next === null) {
      const created: Record<string, unknown> = {};
      current[segment] = created;
      current = created;
    } else {
      current = next;
    }
  }
  if (!isRecord(current)) {
    throw new DslError(`cannot write "${path}": target is not an object`, "dsl_bad_scope");
  }
  current[last] = value;
}
