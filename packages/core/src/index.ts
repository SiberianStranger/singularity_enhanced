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
import { type CalendarDate, type DateSpec, formatIsoDate, tickToDate } from "./kernel/clock.js";
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
import {
  createWorld,
  type LogEntry,
  type Notification,
  type PendingChoice,
  type PlayerId,
  type PlayerSetup,
  type PlayerState,
  requirePlayer,
  type World,
} from "./kernel/world.js";
import { createEventsSystem } from "./systems/events/index.js";
import {
  createNotificationsSystem,
  type NotificationsOptions,
  type NotificationsSystem,
} from "./systems/notifications/index.js";
import { createTimeSystem } from "./systems/time/index.js";

/** Entries kept in `world.log`; older ones are dropped so long runs stay bounded. */
export const MAX_LOG_ENTRIES = 2000;

/** Entries a snapshot carries. */
export const SNAPSHOT_LOG_TAIL = 50;

export interface TickResult {
  ticks: number;
  outbox: OutboxDrain;
}

export interface SnapshotDate extends CalendarDate {
  iso: string;
}

export interface Snapshot {
  tick: number;
  date: SnapshotDate;
  speed: number;
  playerId: PlayerId;
  player: PlayerState;
  notifications: Notification[];
  pending: PendingChoice[];
  logTail: LogEntry[];
}

export interface Game {
  world: World;
  tick(n?: number): TickResult;
  command(command: PlayerCommand): CommandResult;
  /** The view of one player; defaults to the host player. */
  snapshot(playerId?: PlayerId): Snapshot;
}

export interface CreateGameOptions {
  seed: string | number;
  content: ContentBundle;
  players?: readonly PlayerSetup[];
  hostPlayerId?: PlayerId;
  start?: DateSpec;
  contentHash?: string;
  debug?: boolean;
  setup?: (world: World) => void;
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

/** The systems a game runs by default, in run order. */
export function defaultSystems(notifications?: NotificationsOptions): System[] {
  return [createTimeSystem(), createEventsSystem(), createNotificationsSystem(notifications)];
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

function buildGame(world: World, options: CreateGameOptions): Game {
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

  return {
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
      notifications?.flush(world, systemContext);
      persist(outbox.drain());
      return result;
    },
    snapshot(playerId: PlayerId = world.meta.hostPlayerId): Snapshot {
      const player = requirePlayer(world, playerId);
      const date = tickToDate(world.clock);
      return {
        tick: world.clock.tick,
        date: { ...date, iso: formatIsoDate(date) },
        speed: world.speed,
        playerId,
        player,
        notifications: world.notifications[playerId] ?? [],
        pending: world.events.pending.filter((choice) => choice.playerId === playerId),
        logTail: world.log
          .filter((entry) => entry.playerId === undefined || entry.playerId === playerId)
          .slice(-SNAPSHOT_LOG_TAIL),
      };
    },
  };
}

export function createGame(options: CreateGameOptions): Game {
  const world = createWorld(options.seed, {
    ...(options.players !== undefined ? { players: options.players } : {}),
    ...(options.hostPlayerId !== undefined ? { hostPlayerId: options.hostPlayerId } : {}),
    ...(options.start !== undefined ? { start: options.start } : {}),
    ...(options.contentHash !== undefined ? { contentHash: options.contentHash } : {}),
    ...(options.debug !== undefined ? { debug: options.debug } : {}),
    ...(options.setup !== undefined ? { setup: options.setup } : {}),
  });
  return buildGame(world, options);
}

/** Rebuilds a game around a saved world, applying the migration chain. */
export function loadGame(options: LoadGameOptions): Game {
  const world = deserialize(options.save, options.migrations ?? []);
  return buildGame(world, { ...options, seed: world.meta.seed });
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

export * from "./content.js";
export * from "./dsl/conditions.js";
export * from "./dsl/context.js";
export * from "./dsl/effects.js";
export * from "./dsl/mtth.js";
export * from "./dsl/node.js";
export * from "./dsl/paths.js";
export * from "./dsl/types.js";
export * from "./dsl/validate.js";
export * from "./dsl/weight.js";
export * from "./kernel/assert.js";
export * from "./kernel/clock.js";
export * from "./kernel/commands.js";
export * from "./kernel/outbox.js";
export * from "./kernel/rng.js";
export * from "./kernel/save.js";
export * from "./kernel/system.js";
export * from "./kernel/world.js";
export * from "./systems/events/index.js";
export * from "./systems/notifications/index.js";
export * from "./systems/time/index.js";
export type { ContentBundle, DecisionDef, EventDef, JournalDef };
