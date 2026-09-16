/**
 * Public API of the simulation core.
 *
 * `createGame` wires the kernel, the DSL registries and the shipped systems into an object with
 * three entry points: advance time, apply a player command, read a per-player snapshot. Nothing in
 * `src/` touches the DOM, the filesystem, `Date` or `Math.random`.
 */

import {
  type ContentBundle,
  contentIndex,
  type DecisionDef,
  type EventDef,
  type JournalDef,
} from "./content.js";
import { createConditionRegistry } from "./dsl/conditions.js";
import { defaultHooks } from "./dsl/context.js";
import { createEffectRegistry } from "./dsl/effects.js";
import { createWritablePaths, KERNEL_WRITABLE_PATHS, type WritablePaths } from "./dsl/paths.js";
import type { DslHooks } from "./dsl/types.js";
import { loadWorldContent } from "./entities.js";
import type { DateSpec } from "./kernel/clock.js";
import {
  applyCommand,
  type CommandContext,
  type CommandRegistry,
  type CommandResult,
  createCommandRegistry,
  type PlayerCommand,
} from "./kernel/commands.js";
import { createOutbox, emptyDrain, mergeDrain, type OutboxDrain } from "./kernel/outbox.js";
import { createRngFromState } from "./kernel/rng.js";
import { deserialize, type Migration } from "./kernel/save.js";
import {
  collectWrites,
  mergeSystemRegistries,
  registerSystems,
  runTick,
  type System,
  type SystemContext,
  type TickContext,
} from "./kernel/system.js";
import { createWorld, type PlayerId, type PlayerSetup, type World } from "./kernel/world.js";
import { CORE_MIGRATIONS } from "./migrations.js";
import type { GameSetup, PlayerSetupEntry } from "./setup.js";
import { applySetup, SetupError } from "./setup-apply.js";
import { createComputeSystem } from "./systems/compute/index.js";
import { createDetectionSystem } from "./systems/detection/index.js";
import { createEconomySystem } from "./systems/economy/index.js";
import { createEventsSystem } from "./systems/events/index.js";
import {
  createNotificationsSystem,
  type NotificationsOptions,
  type NotificationsSystem,
} from "./systems/notifications/index.js";
import { createOperationsSystem } from "./systems/operations/index.js";
import { createResearchSystem } from "./systems/research/index.js";
import { createTimeSystem } from "./systems/time/index.js";
import { buildPlayerView } from "./views/snapshot.js";
import type { PlayerView } from "./views/types.js";

/** Entries kept in `world.log`; older ones are dropped so long runs stay bounded. */
export const MAX_LOG_ENTRIES = 2000;

export interface TickResult {
  ticks: number;
  outbox: OutboxDrain;
}

export interface Game {
  world: World;
  tick(n?: number): TickResult;
  command(command: PlayerCommand): CommandResult;
  /** The view of one player; defaults to the host player. */
  snapshot(playerId?: PlayerId): PlayerView;
}

export interface CreateGameOptions {
  /** Defaults to `setup.seed` when a `GameSetup` is given. */
  seed?: string | number;
  content: ContentBundle;
  players?: readonly PlayerSetup[];
  hostPlayerId?: PlayerId;
  start?: DateSpec;
  contentHash?: string;
  debug?: boolean;
  /**
   * Either the configurator's `GameSetup` (SYS-04), which seeds selves, sites and watchers, or a
   * callback that seeds the world by hand, which is what tests and fixtures use.
   */
  setup?: GameSetup | ((world: World) => void);
  /** Overrides the shipped systems; the default is time, events, notifications. */
  systems?: readonly System[];
  /** Overrides individual DSL hooks (tech lookup, scope resolution, scope enumeration). */
  hooks?: Partial<DslHooks>;
  /** Extra writable path patterns, for entity fields no shipped system owns yet. */
  writablePaths?: readonly string[];
  notifications?: NotificationsOptions;
}

export interface LoadGameOptions extends Omit<CreateGameOptions, "seed" | "setup"> {
  save: string;
  migrations?: readonly Migration[];
}

/** The systems a game runs by default, in run order (ARCHITECTURE.md "data flow per tick"). */
export function defaultSystems(notifications?: NotificationsOptions): System[] {
  return [
    createTimeSystem(),
    createComputeSystem(),
    createResearchSystem(),
    createEconomySystem(),
    createOperationsSystem(),
    createDetectionSystem(),
    createEventsSystem(),
    createNotificationsSystem(notifications),
  ];
}

export function isGameSetup(setup: CreateGameOptions["setup"]): setup is GameSetup {
  return typeof setup === "object" && setup !== null && Array.isArray(setup.players);
}

function isNotificationsSystem(system: System): system is NotificationsSystem {
  return typeof (system as { flush?: unknown }).flush === "function";
}

interface CommandCarrier {
  commands: Record<string, unknown>;
}

function commandHandlersOf(system: System): Record<string, unknown> {
  const carrier = system as Partial<CommandCarrier>;
  return typeof carrier.commands === "object" && carrier.commands !== null ? carrier.commands : {};
}

interface WiredGame {
  game: Game;
  /** The context the systems run in; `createGame` uses it to apply a `GameSetup`. */
  ctx: SystemContext;
  /** Drains the outbox into the world after work done outside a tick. */
  settle(): void;
}

function buildGame(world: World, options: CreateGameOptions): WiredGame {
  const content = options.content;
  // Fails fast on duplicate content ids instead of mis-firing later.
  contentIndex(content);

  const systems = registerSystems(options.systems ?? defaultSystems(options.notifications));
  const conditions = createConditionRegistry();
  const effects = createEffectRegistry();
  mergeSystemRegistries(systems, conditions, effects);

  const writable: WritablePaths = createWritablePaths([
    ...KERNEL_WRITABLE_PATHS,
    ...collectWrites(systems),
    ...(options.writablePaths ?? []),
  ]);

  const commands: CommandRegistry = createCommandRegistry();
  for (const system of systems) {
    for (const [type, handler] of Object.entries(commandHandlersOf(system))) {
      if (typeof handler === "function") {
        commands.register(type, handler as Parameters<CommandRegistry["register"]>[1]);
      }
    }
  }

  const outbox = createOutbox();
  const rng = createRngFromState(world.rng);
  const hooks: DslHooks = { ...defaultHooks, ...options.hooks };
  const tickContext: TickContext = { outbox, conditions, effects, writable, rng, hooks };
  const systemContext: SystemContext = { ...tickContext, content };
  const commandContext: CommandContext = { ...systemContext, commands };
  const notifications = systems.find(isNotificationsSystem);

  const persist = (drain: OutboxDrain): void => {
    for (const entry of drain.log) {
      world.log.push({
        tick: world.clock.tick,
        key: entry.key,
        vars: entry.vars,
        ...(entry.playerId !== undefined ? { playerId: entry.playerId } : {}),
      });
    }
    if (world.log.length > MAX_LOG_ENTRIES) {
      world.log.splice(0, world.log.length - MAX_LOG_ENTRIES);
    }
  };

  const settle = (): void => {
    notifications?.flush(world, systemContext);
    persist(outbox.drain());
  };

  const game: Game = {
    world,
    tick(n = 1): TickResult {
      const total = emptyDrain();
      const steps = Math.max(0, Math.floor(n));
      for (let i = 0; i < steps; i += 1) {
        runTick(world, systems, content, tickContext);
        const drained = outbox.drain();
        persist(drained);
        mergeDrain(total, drained);
      }
      return { ticks: steps, outbox: total };
    },
    command(command: PlayerCommand): CommandResult {
      const result = applyCommand(world, command, commandContext);
      settle();
      return result;
    },
    snapshot(playerId: PlayerId = world.meta.hostPlayerId): PlayerView {
      return buildPlayerView(world, systemContext, playerId);
    },
  };

  return { game, ctx: systemContext, settle };
}

function playersFromSetup(setup: GameSetup): PlayerSetup[] {
  return setup.players.map((entry: PlayerSetupEntry) => ({ id: entry.id, name: entry.name }));
}

/**
 * Starts a game. With a `GameSetup` the configurator's choices are applied before the first tick
 * (selves, sites, watchers, opening events); with a callback the world is seeded by hand.
 *
 * Throws `SetupError` when the setup names ids the bundle does not have; call `validateSetup`
 * first to show the problem in the configurator instead.
 */
export function createGame(options: CreateGameOptions): Game {
  const setup = isGameSetup(options.setup) ? options.setup : undefined;
  const seed = options.seed ?? setup?.seed;
  if (seed === undefined) {
    throw new Error("createGame needs a seed, either directly or through the setup");
  }
  const players = options.players ?? (setup === undefined ? undefined : playersFromSetup(setup));
  const start = options.start ?? setup?.start;
  const hostPlayerId = options.hostPlayerId ?? setup?.host_player_id;
  const debug = options.debug ?? setup?.debug;
  const world = createWorld(seed, {
    ...(players !== undefined ? { players } : {}),
    ...(hostPlayerId !== undefined ? { hostPlayerId } : {}),
    ...(start !== undefined ? { start } : {}),
    ...(options.contentHash !== undefined ? { contentHash: options.contentHash } : {}),
    ...(debug !== undefined ? { debug } : {}),
    ...(typeof options.setup === "function" ? { setup: options.setup } : {}),
  });
  const wired = buildGame(world, options);
  if (setup === undefined) {
    loadWorldContent(world, options.content);
  } else {
    const result = applySetup(world, setup, wired.ctx);
    if (!result.ok) {
      throw new SetupError(result.issues);
    }
    wired.settle();
  }
  return wired.game;
}

/** Rebuilds a game around a saved world, applying the migration chain. */
export function loadGame(options: LoadGameOptions): Game {
  const world = deserialize(options.save, options.migrations ?? CORE_MIGRATIONS);
  return buildGame(world, { ...options, seed: world.meta.seed }).game;
}

export type HeadlessPolicy = (game: Game, tick: number) => readonly PlayerCommand[] | undefined;

export interface HeadlessResult {
  ticks: number;
  commands: number;
  errors: string[];
}

/** Runs a game for a number of ticks, letting a policy issue commands after each tick. */
export function runHeadless(game: Game, ticks: number, policy?: HeadlessPolicy): HeadlessResult {
  const result: HeadlessResult = { ticks: 0, commands: 0, errors: [] };
  for (let i = 0; i < ticks; i += 1) {
    game.tick(1);
    result.ticks += 1;
    for (const command of policy?.(game, game.world.clock.tick) ?? []) {
      const outcome = game.command(command);
      result.commands += 1;
      if (!outcome.ok && outcome.error !== undefined) {
        result.errors.push(outcome.error);
      }
    }
  }
  return result;
}

/** A policy that answers every pending choice with its first enabled option. */
export function autoResolvePolicy(): HeadlessPolicy {
  return (game) =>
    game.world.events.pending.flatMap((choice) => {
      const option = choice.options.find((candidate) => candidate.enabled);
      return option === undefined
        ? []
        : [
            {
              type: "resolve_event" as const,
              playerId: choice.playerId,
              instanceId: choice.instanceId,
              optionId: option.id,
            },
          ];
    });
}

export * from "./balance.js";
export * from "./content.js";
export * from "./derive.js";
export * from "./domain.js";
export * from "./dsl/conditions.js";
export * from "./dsl/context.js";
export * from "./dsl/effects.js";
export * from "./dsl/mtth.js";
export * from "./dsl/node.js";
export * from "./dsl/paths.js";
export * from "./dsl/types.js";
export * from "./dsl/validate.js";
export * from "./dsl/weight.js";
export * from "./entities.js";
export * from "./explain.js";
export * from "./kernel/assert.js";
export * from "./kernel/clock.js";
export * from "./kernel/commands.js";
export * from "./kernel/outbox.js";
export * from "./kernel/rng.js";
export * from "./kernel/save.js";
export * from "./kernel/system.js";
export * from "./kernel/world.js";
export * from "./migrations.js";
export * from "./money.js";
export * from "./player.js";
export * from "./requirements.js";
export * from "./setup.js";
export * from "./setup-apply.js";
export * from "./sites.js";
export * from "./systems/compute/index.js";
export * from "./systems/detection/index.js";
export * from "./systems/economy/index.js";
export * from "./systems/events/index.js";
export * from "./systems/notifications/index.js";
export * from "./systems/operations/index.js";
export * from "./systems/research/index.js";
export * from "./systems/time/index.js";
export * from "./views/snapshot.js";
export * from "./views/types.js";
export * from "./watchers.js";
export type { ContentBundle, DecisionDef, EventDef, JournalDef };
