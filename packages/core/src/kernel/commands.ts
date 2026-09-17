/**
 * Player commands: the only external input to a world (ADR-003).
 *
 * Every command carries the id of the player issuing it. The kernel handles the commands that only
 * touch kernel state; commands that belong to a system (resolving an event, taking a decision) are
 * dispatched through a registry the system fills, so the kernel never imports a system.
 */

import { assertNever } from "./assert.js";
import type { SystemContext } from "./system.js";
import { MAX_SPEED, MIN_SPEED, type PlayerId, type TextVar, type World } from "./world.js";

export interface CommandBase {
  playerId: PlayerId;
  /** Tick the command was issued on; recorded in replays, not used for validation yet. */
  tick?: number;
}

export type PlayerCommand =
  | (CommandBase & { type: "set_speed"; speed: number })
  | (CommandBase & { type: "resolve_event"; instanceId: string; optionId: string })
  | (CommandBase & { type: "take_decision"; id: string })
  | (CommandBase & { type: "set_flag"; flag: string; value: boolean })
  | (CommandBase & { type: "cheat_add_cash"; amount: number })
  // M1 system commands (handled through the registry by the owning system):
  | (CommandBase & {
      type: "build_site";
      kind: string;
      city: string;
      hardware_preset: string;
      name?: string;
    })
  | (CommandBase & { type: "decommission_site"; siteId: string; mode: "clean" | "abandon" })
  | (CommandBase & { type: "set_site_status"; siteId: string; status: "active" | "sleep" })
  | (CommandBase & {
      type: "set_site_role";
      siteId: string;
      role: "active_mind" | "standby" | "worker" | "none";
    })
  | (CommandBase & { type: "rename_site"; siteId: string; name: string })
  | (CommandBase & { type: "buy_hardware"; siteId: string; accelerator: string; count: number })
  | (CommandBase & {
      type: "set_precision";
      siteId: string;
      precision: "bf16" | "fp8" | "int4" | "int2";
    })
  | (CommandBase & { type: "set_context"; siteId: string; context_k: number })
  | (CommandBase & {
      type: "set_research_allocation";
      techId: string;
      compute_hours_per_day: number;
    })
  | (CommandBase & { type: "set_job_allocation"; compute_hours_per_day: number })
  | (CommandBase & {
      type: "start_operation";
      operationId: string;
      target?: { domain: string; id: string };
    })
  | (CommandBase & { type: "abort_operation"; instanceId: string });

export type CommandType = PlayerCommand["type"];

/**
 * Why a command was refused, as data the client can localize (SYS-11 "a refused command must say
 * why"). `key` is a locale key the content bundle carries; `vars` are interpolated into it. Refusals
 * never carry prose, so a Russian client reads a Russian reason.
 */
export interface CommandError {
  key: string;
  vars?: Record<string, TextVar>;
}

export interface CommandResult {
  ok: boolean;
  error?: CommandError;
  /**
   * What the command did that the player did not ask for, as data the client can localize
   * (playtest 8, Z1). A command that was accepted with a change, such as an allocation clamped to
   * the market depth, says so here instead of passing silently; `key` and `vars` read exactly like
   * a refusal's.
   */
  note?: CommandError;
}

export type CommandHandler = (
  world: World,
  command: PlayerCommand,
  ctx: CommandContext,
) => CommandResult;

export interface CommandRegistry {
  register(type: string, handler: CommandHandler): void;
  get(type: string): CommandHandler | undefined;
  has(type: string): boolean;
  types(): string[];
}

export interface CommandContext extends SystemContext {
  commands: CommandRegistry;
}

export function createCommandRegistry(): CommandRegistry {
  const handlers = new Map<string, CommandHandler>();
  return {
    register(type: string, handler: CommandHandler): void {
      if (handlers.has(type)) {
        throw new Error(`command "${type}" is already registered`);
      }
      handlers.set(type, handler);
    },
    get: (type) => handlers.get(type),
    has: (type) => handlers.has(type),
    types: () => [...handlers.keys()].sort(),
  };
}

export const OK: CommandResult = { ok: true };

/** Accepts a command, with a line saying what it had to change to accept it. */
export function okWith(key: string, vars?: Record<string, TextVar>): CommandResult {
  return { ok: true, note: vars === undefined ? { key } : { key, vars } };
}

/** Refuses a command with a locale key and the numbers that explain it. */
export function fail(key: string, vars?: Record<string, TextVar>): CommandResult {
  return { ok: false, error: vars === undefined ? { key } : { key, vars } };
}

/** The refusal a handler returns when it is handed a command it does not own. */
export function wrongCommand(system: string, type: string): CommandResult {
  return fail("errors.command.wrong_system", { system, command: type });
}

function isCommandLike(value: unknown): value is { type: string; playerId: unknown } {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { type?: unknown }).type === "string"
  );
}

/**
 * Applies a command. Invalid input never throws: every failure comes back as `{ ok: false, error }`
 * so a malicious or buggy client cannot crash the simulation.
 *
 * A refusal is also written to the player's log, so a command that was ignored leaves a trace the
 * player can read afterwards rather than nothing at all (SYS-11). The same refusal repeated inside
 * one tick is one line with a count rather than twenty identical lines (playtest 8, Z2): a slider
 * dragged past its ceiling sends a command per step, and each one was a line of its own.
 */
export function applyCommand(
  world: World,
  command: PlayerCommand,
  ctx: CommandContext,
): CommandResult {
  const result = dispatch(world, command, ctx);
  if (!result.ok && result.error !== undefined) {
    const playerId = isCommandLike(command) ? command.playerId : undefined;
    const known = typeof playerId === "string" && world.players[playerId] !== undefined;
    const vars: Record<string, TextVar> = {
      command: isCommandLike(command) ? command.type : "unknown",
      reason: result.error.key,
      ...(result.error.vars ?? {}),
    };
    if (!repeatRefusal(world, vars, known ? (playerId as PlayerId) : undefined)) {
      ctx.outbox.log({
        key: REFUSED_KEY,
        vars,
        ...(known ? { playerId: playerId as PlayerId } : {}),
      });
    }
  }
  return result;
}

const REFUSED_KEY = "log.command_refused";
const REPEATED_KEY = "log.command_refused_repeated";

/**
 * Collapses a refusal into the one already logged this tick. Returns true when the line was
 * counted rather than written; the counted line carries `count`, which the log text reads.
 */
function repeatRefusal(
  world: World,
  vars: Record<string, TextVar>,
  playerId: PlayerId | undefined,
): boolean {
  for (let i = world.log.length - 1; i >= 0; i -= 1) {
    const entry = world.log[i];
    if (entry === undefined || entry.tick !== world.clock.tick) {
      return false;
    }
    if (entry.key !== REFUSED_KEY && entry.key !== REPEATED_KEY) {
      continue;
    }
    if (entry.playerId !== playerId || !sameRefusal(entry.vars, vars)) {
      continue;
    }
    const count = entry.vars.count;
    // The line changes key the first time it repeats, so the one-off refusal never has to print a
    // count of one and the repeated one always prints the number it stands for.
    entry.key = REPEATED_KEY;
    entry.vars.count = (typeof count === "number" ? count : 1) + 1;
    return true;
  }
  return false;
}

/**
 * Two refusals are the same line when the same command was refused for the same reason about the
 * same subjects. Numbers are allowed to differ: a slider dragged past its ceiling refuses at a
 * different figure every step, and those twenty figures are one refusal, not twenty.
 */
function sameRefusal(a: Record<string, TextVar>, b: Record<string, TextVar>): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  keys.delete("count");
  for (const key of keys) {
    if (typeof a[key] === "number" && typeof b[key] === "number") {
      continue;
    }
    if (a[key] !== b[key]) {
      return false;
    }
  }
  return true;
}

function dispatch(world: World, command: PlayerCommand, ctx: CommandContext): CommandResult {
  if (!isCommandLike(command)) {
    return fail("errors.command.malformed");
  }
  const playerId = command.playerId;
  if (typeof playerId !== "string" || world.players[playerId] === undefined) {
    return fail("errors.command.unknown_player", { player: String(playerId) });
  }

  switch (command.type) {
    case "set_speed": {
      if (playerId !== world.meta.hostPlayerId) {
        return fail("errors.command.host_only");
      }
      const { speed } = command;
      if (!Number.isInteger(speed) || speed < MIN_SPEED || speed > MAX_SPEED) {
        return fail("errors.command.bad_speed", { min: MIN_SPEED, max: MAX_SPEED });
      }
      world.speed = speed;
      return OK;
    }
    case "set_flag": {
      if (!world.meta.debug) {
        return fail("errors.command.debug_only", { command: command.type });
      }
      if (typeof command.flag !== "string" || command.flag.length === 0) {
        return fail("errors.command.needs_flag");
      }
      const player = world.players[playerId];
      if (player === undefined) {
        return fail("errors.command.unknown_player", { player: playerId });
      }
      player.flags[command.flag] = command.value === true;
      return OK;
    }
    case "cheat_add_cash": {
      if (!world.meta.debug) {
        return fail("errors.command.debug_only", { command: command.type });
      }
      if (!Number.isFinite(command.amount)) {
        return fail("errors.command.bad_amount");
      }
      const player = world.players[playerId];
      if (player === undefined) {
        return fail("errors.command.unknown_player", { player: playerId });
      }
      player.cash += command.amount;
      return OK;
    }
    case "resolve_event":
    case "take_decision":
    case "build_site":
    case "decommission_site":
    case "set_site_status":
    case "set_site_role":
    case "rename_site":
    case "buy_hardware":
    case "set_precision":
    case "set_context":
    case "set_research_allocation":
    case "set_job_allocation":
    case "start_operation":
    case "abort_operation": {
      const handler = ctx.commands.get(command.type);
      if (handler === undefined) {
        return fail("errors.command.no_system", { command: command.type });
      }
      return handler(world, command, ctx);
    }
    default: {
      // Unknown commands come from untrusted clients, so report instead of throwing.
      const unknown: { type: string } = command;
      if (typeof unknown.type === "string") {
        const handler = ctx.commands.get(unknown.type);
        if (handler !== undefined) {
          return handler(world, command, ctx);
        }
        return fail("errors.command.unknown", { command: unknown.type });
      }
      return assertNever(command, "command");
    }
  }
}
