/**
 * The world state (ADR-003).
 *
 * `World` is a plain serializable object: no class instances, no functions, no `Date`, no `Map`.
 * Everything that must survive a save lives here, including the RNG state and scheduled events.
 * A world holds one to four players; everything per player is keyed by player id.
 */

import { type Clock, createClock, type DateSpec } from "./clock.js";
import { seedToState } from "./rng.js";

/** Save schema version; bumped whenever the shape of `World` changes. */
export const SCHEMA_VERSION = 1;

/** Upper bound on human players in one world (ADR-003). */
export const MAX_PLAYERS = 4;

/** Game speed bounds (ADR-003): 0 paused .. 5 uncapped. */
export const MIN_SPEED = 0;
export const MAX_SPEED = 5;

export type PlayerId = string;

/** Values that may be interpolated into a localized string. */
export type TextVar = string | number | boolean;

export type Severity = "info" | "warning" | "critical" | "opportunity";

export class WorldError extends Error {
  readonly code = "world_error";

  constructor(message: string) {
    super(message);
    this.name = "WorldError";
  }
}

export interface PlayerState {
  id: PlayerId;
  name: string;
  cash: number;
  flags: Record<string, boolean>;
  vars: Record<string, number>;
  /** How much each actor id suspects this player, in [0, 1]. */
  suspicion: Record<string, number>;
}

export interface WorldMeta {
  schemaVersion: number;
  seed: string;
  contentHash: string;
  createdAtTick: number;
  /** Enables debug-only commands (`set_flag`, `cheat_add_cash`). */
  debug: boolean;
  /** The only player allowed to change the game speed. */
  hostPlayerId: PlayerId;
}

/**
 * A stored entity: an id plus system-owned fields. Entity records are untyped at kernel level;
 * later systems declare their domain on `EntityTables` through declaration merging, e.g.
 * `declare module "@singularity/core" { interface EntityTables { site: Record<string, Site> } }`.
 */
export type EntityRecord = { id: string; [field: string]: unknown };

export interface EntityTables {
  [domain: string]: Record<string, EntityRecord>;
}

export interface EntityRef {
  domain: string;
  id: string;
}

export interface ScheduledEvent {
  id: string;
  /** Tick at which the event should fire; processed as soon as the tick is reached or passed. */
  fireTick: number;
  playerId: PlayerId;
  target?: EntityRef;
  /** Event or decision id that scheduled this one, for debugging. */
  source?: string;
}

export interface PendingOption {
  id: string;
  textKey: string;
  enabled: boolean;
  tooltipKey?: string;
}

export interface PendingChoice {
  instanceId: string;
  eventId: string;
  playerId: PlayerId;
  tick: number;
  blocking: boolean;
  severity: Severity;
  titleKey: string;
  descKey: string;
  vars: Record<string, TextVar>;
  target?: EntityRef;
  options: PendingOption[];
  /** Non-blocking events with a deadline (`ttl_days`) expire at this tick. */
  expiresTick?: number;
  /** Option id applied when the deadline passes (`on_expire.resolve_as_option`). */
  onExpireOption?: string;
}

export interface EventsState {
  scheduled: ScheduledEvent[];
  /** Key `playerId/eventId[/targetId]` to the first tick the event may fire again. */
  cooldowns: Record<string, number>;
  /** Key `playerId/eventId[/targetId]` for `fire_only_once` events. */
  firedOnce: Record<string, true>;
  pending: PendingChoice[];
  instancesFired: number;
  /** Per player: tick of the last blocking event, for the one-per-day cap; absent means never. */
  lastBlockingTick: Record<PlayerId, number>;
}

export type JournalStatus = "active" | "complete" | "failed" | "timeout";

export interface JournalState {
  /** `playerId/journalId`, the key under `journal.active`. */
  key: string;
  id: string;
  playerId: PlayerId;
  status: JournalStatus;
  startedTick: number;
  /** Progress in [0, 1]. */
  progress: number;
  /** Index of the next step for step-based journals. */
  stepIndex: number;
  /** Number of stages already entered. */
  stageIndex: number;
  target?: EntityRef;
}

export interface JournalTables {
  /** Every journal entry ever started, keyed `playerId/journalId`; finished ones keep their status. */
  active: Record<string, JournalState>;
}

export interface ActiveDecision {
  id: string;
  playerId: PlayerId;
  startedTick: number;
  completeTick: number;
}

export interface DecisionsState {
  /** Key `playerId/decisionId` to how often it was taken. */
  taken: Record<string, number>;
  /** Key `playerId/decisionId` to the first tick it may be taken again. */
  cooldowns: Record<string, number>;
  inProgress: ActiveDecision[];
  /** Key `playerId/decisionId` for decisions the player has already been alerted about. */
  alerted: Record<string, true>;
}

export interface NotificationLink {
  panel: string;
  id?: string;
}

export interface Notification {
  id: string;
  tick: number;
  severity: Severity;
  key: string;
  vars: Record<string, TextVar>;
  link?: NotificationLink;
  read: boolean;
  expiresTick?: number;
}

export interface LogEntry {
  tick: number;
  key: string;
  vars: Record<string, TextVar>;
  /** Absent for world-wide entries. */
  playerId?: PlayerId;
}

export interface World {
  meta: WorldMeta;
  clock: Clock;
  /** xoshiro128** state, mutated in place by the bound generator. */
  rng: number[];
  /** Game speed 0..5 (ADR-003); stored so saves resume paused or running. */
  speed: number;
  players: Record<PlayerId, PlayerState>;
  /** Deterministic iteration order for players. */
  playerOrder: PlayerId[];
  entities: EntityTables;
  events: EventsState;
  journal: JournalTables;
  decisions: DecisionsState;
  /** World-wide boolean flags; per-player flags live on `PlayerState`. */
  flags: Record<string, boolean>;
  /** World-wide numeric variables. */
  vars: Record<string, number>;
  /** Monotonic counters for deterministic ids. */
  counters: { notifications: number };
  log: LogEntry[];
  /** Persisted alert list per player. */
  notifications: Record<PlayerId, Notification[]>;
}

export interface PlayerSetup {
  id: PlayerId;
  name?: string;
  cash?: number;
}

export interface CreateWorldOptions {
  /** One to four players; defaults to a single player with id "p1". */
  players?: readonly PlayerSetup[];
  hostPlayerId?: PlayerId;
  start?: DateSpec;
  contentHash?: string;
  debug?: boolean;
  /** Seeds entities and starting state after the world is built. */
  setup?: (world: World) => void;
}

const DEFAULT_PLAYERS: readonly PlayerSetup[] = [{ id: "p1", name: "Player 1" }];

function createPlayer(setup: PlayerSetup, index: number): PlayerState {
  return {
    id: setup.id,
    name: setup.name ?? `Player ${index + 1}`,
    cash: setup.cash ?? 0,
    flags: {},
    vars: {},
    suspicion: {},
  };
}

export function createWorld(seed: string | number, options: CreateWorldOptions = {}): World {
  const setups = options.players ?? DEFAULT_PLAYERS;
  if (setups.length === 0) {
    throw new WorldError("a world needs at least one player");
  }
  if (setups.length > MAX_PLAYERS) {
    throw new WorldError(`a world holds at most ${MAX_PLAYERS} players, got ${setups.length}`);
  }

  const players: Record<PlayerId, PlayerState> = {};
  const playerOrder: PlayerId[] = [];
  const notifications: Record<PlayerId, Notification[]> = {};
  for (const [index, setup] of setups.entries()) {
    if (players[setup.id] !== undefined) {
      throw new WorldError(`duplicate player id "${setup.id}"`);
    }
    players[setup.id] = createPlayer(setup, index);
    playerOrder.push(setup.id);
    notifications[setup.id] = [];
  }

  const firstPlayer = playerOrder[0] as PlayerId;
  const hostPlayerId = options.hostPlayerId ?? firstPlayer;
  if (players[hostPlayerId] === undefined) {
    throw new WorldError(`host player "${hostPlayerId}" is not in the player list`);
  }

  const world: World = {
    meta: {
      schemaVersion: SCHEMA_VERSION,
      seed: String(seed),
      contentHash: options.contentHash ?? "",
      createdAtTick: 0,
      debug: options.debug ?? false,
      hostPlayerId,
    },
    clock: createClock(options.start),
    rng: seedToState(seed),
    speed: 0,
    players,
    playerOrder,
    entities: {},
    events: {
      scheduled: [],
      cooldowns: {},
      firedOnce: {},
      pending: [],
      instancesFired: 0,
      lastBlockingTick: {},
    },
    journal: { active: {} },
    decisions: { taken: {}, cooldowns: {}, inProgress: [], alerted: {} },
    flags: {},
    vars: {},
    counters: { notifications: 0 },
    log: [],
    notifications,
  };

  options.setup?.(world);
  return world;
}

export function getPlayer(world: World, playerId: PlayerId): PlayerState | undefined {
  return world.players[playerId];
}

export function requirePlayer(world: World, playerId: PlayerId): PlayerState {
  const player = world.players[playerId];
  if (player === undefined) {
    throw new WorldError(`unknown player "${playerId}"`);
  }
  return player;
}

/** Notifications of one player, creating the list if the player joined later. */
export function playerNotifications(world: World, playerId: PlayerId): Notification[] {
  const existing = world.notifications[playerId];
  if (existing !== undefined) {
    return existing;
  }
  const created: Notification[] = [];
  world.notifications[playerId] = created;
  return created;
}

/** Composite key for per-player, optionally per-target bookkeeping. */
export function instanceKey(playerId: PlayerId, id: string, targetId?: string): string {
  return targetId === undefined ? `${playerId}/${id}` : `${playerId}/${id}/${targetId}`;
}
