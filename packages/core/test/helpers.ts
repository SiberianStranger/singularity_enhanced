import type {
  ContentBundle,
  DecisionDef,
  EventDef,
  HookDef,
  JournalDef,
  TechDef,
} from "../src/content.js";
import { createConditionRegistry } from "../src/dsl/conditions.js";
import { createDslContext, defaultHooks } from "../src/dsl/context.js";
import { createEffectRegistry } from "../src/dsl/effects.js";
import { createWritablePaths, KERNEL_WRITABLE_PATHS } from "../src/dsl/paths.js";
import type { DslContext, ScopeEnv } from "../src/dsl/types.js";
import { createOutbox, type Outbox } from "../src/kernel/outbox.js";
import { createRngFromState } from "../src/kernel/rng.js";
import { createWorld, type PlayerId, type World } from "../src/kernel/world.js";

export interface BundleParts {
  events?: EventDef[];
  decisions?: DecisionDef[];
  journal?: JournalDef[];
  hooks?: HookDef[];
  techs?: TechDef[];
  locales?: Record<string, string>;
  scripted_triggers?: Record<string, Record<string, unknown>>;
  scripted_effects?: Record<string, Record<string, unknown>[]>;
}

/** A content bundle with sensible empty defaults for tests. */
export function bundle(parts: BundleParts = {}): ContentBundle {
  return {
    events: parts.events ?? [],
    decisions: parts.decisions ?? [],
    journal: parts.journal ?? [],
    hooks: parts.hooks ?? [],
    techs: parts.techs ?? [],
    locales: { en: parts.locales ?? {} },
    ...(parts.scripted_triggers !== undefined
      ? { scripted_triggers: parts.scripted_triggers }
      : {}),
    ...(parts.scripted_effects !== undefined ? { scripted_effects: parts.scripted_effects } : {}),
  };
}

export interface TestContext {
  world: World;
  ctx: DslContext;
  outbox: Outbox;
}

/** A world plus an evaluation context, for DSL unit tests. */
export function testContext(
  options: {
    seed?: string;
    content?: ContentBundle;
    bindings?: ScopeEnv;
    writablePaths?: string[];
    playerId?: PlayerId;
    players?: { id: string; name?: string }[];
  } = {},
): TestContext {
  const world = createWorld(options.seed ?? "test", {
    ...(options.players !== undefined ? { players: options.players } : {}),
  });
  const outbox = createOutbox();
  const ctx = createDslContext({
    world,
    playerId: options.playerId ?? "p1",
    rng: createRngFromState(world.rng),
    outbox,
    conditions: createConditionRegistry(),
    effects: createEffectRegistry(),
    writable: createWritablePaths([...KERNEL_WRITABLE_PATHS, ...(options.writablePaths ?? [])]),
    content: options.content ?? bundle(),
    hooks: defaultHooks,
    ...(options.bindings !== undefined ? { bindings: options.bindings } : {}),
  });
  return { world, ctx, outbox };
}

/** The keys logged through the outbox, for asserting on DSL warnings. */
export function logKeys(outbox: Outbox): string[] {
  return outbox.read().log.map((entry) => entry.key);
}

export function logMessages(outbox: Outbox): string[] {
  return outbox
    .read()
    .log.map((entry) => String(entry.vars.message ?? entry.vars.kind ?? ""))
    .filter((message) => message.length > 0);
}
