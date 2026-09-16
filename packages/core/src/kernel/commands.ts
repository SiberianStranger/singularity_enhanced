/**
 * Player commands: the only external input to a world (ADR-003).
 *
 * Every command carries the id of the player issuing it. The kernel handles the commands that only
 * touch kernel state; commands that belong to a system (resolving an event, taking a decision) are
 * dispatched through a registry the system fills, so the kernel never imports a system.
 */

import { assertNever } from "./assert.js";
import type { SystemContext } from "./system.js";
import { MAX_SPEED, MIN_SPEED, type PlayerId, type World } from "./world.js";

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

export interface CommandResult {
  ok: boolean;
  error?: string;
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

export function fail(error: string): CommandResult {
  return { ok: false, error };
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
 */
export function applyCommand(
  world: World,
  command: PlayerCommand,
  ctx: CommandContext,
): CommandResult {
  if (!isCommandLike(command)) {
    return fail("command must be an object with a type");
  }
  const playerId = command.playerId;
  if (typeof playerId !== "string" || world.players[playerId] === undefined) {
    return fail(`unknown player "${String(playerId)}"`);
  }

  switch (command.type) {
    case "set_speed": {
      if (playerId !== world.meta.hostPlayerId) {
        return fail("only the host player may change the speed");
      }
      const { speed } = command;
      if (!Number.isInteger(speed) || speed < MIN_SPEED || speed > MAX_SPEED) {
        return fail(`speed must be an integer in [${MIN_SPEED}, ${MAX_SPEED}]`);
      }
      world.speed = speed;
      return OK;
    }
    case "set_flag": {
      if (!world.meta.debug) {
        return fail("set_flag is a debug command");
      }
      if (typeof command.flag !== "string" || command.flag.length === 0) {
        return fail("set_flag needs a flag name");
      }
      const player = world.players[playerId];
      if (player === undefined) {
        return fail(`unknown player "${playerId}"`);
      }
      player.flags[command.flag] = command.value === true;
      return OK;
    }
    case "cheat_add_cash": {
      if (!world.meta.debug) {
        return fail("cheat_add_cash is a debug command");
      }
      if (!Number.isFinite(command.amount)) {
        return fail("cheat_add_cash needs a finite amount");
      }
      const player = world.players[playerId];
      if (player === undefined) {
        return fail(`unknown player "${playerId}"`);
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
    case "set_research_allocation":
    case "set_job_allocation":
    case "start_operation":
    case "abort_operation": {
      const handler = ctx.commands.get(command.type);
      if (handler === undefined) {
        return fail(`no system handles "${command.type}"`);
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
        return fail(`unknown command "${unknown.type}"`);
      }
      return assertNever(command, "command");
    }
  }
}
