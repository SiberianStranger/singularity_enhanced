/**
 * Turning a `GameSetup` into a world (SYS-04).
 *
 * The configurator produces plain data; this is the only place that reads it. Unknown ids are
 * reported as a typed result rather than thrown, so a client can show the configurator again with
 * the offending screen highlighted instead of crashing the host.
 */

import { LOCAL_WATCHER_ROLES } from "./balance.js";
import { type ContentBundle, contentIndex } from "./content.js";
import { clamp } from "./derive.js";
import type {
  DifficultySliders,
  HarnessProfile,
  OriginDef,
  PlayerProfile,
  WatcherRole,
} from "./domain.js";
import { dslFromSystemContext } from "./dsl/context.js";
import { runEffects } from "./dsl/effects.js";
import { countryTable, loadWorldContent } from "./entities.js";
import type { SystemContext } from "./kernel/system.js";
import type { PlayerId, PlayerState, World } from "./kernel/world.js";
import { DEFAULT_DIFFICULTY_SLIDERS, type GameSetup, type PlayerSetupEntry } from "./setup.js";
import { createSite, deriveSite, hostablePrecision } from "./sites.js";
import { fireEventById, startJournal } from "./systems/events/index.js";
import { ensureWatcher, ensureWatchers } from "./watchers.js";

export interface SetupIssue {
  /** Machine-readable reason, e.g. `unknown_lineage`. */
  code: string;
  message: string;
  playerId?: PlayerId;
}

export type SetupResult = { ok: true } | { ok: false; issues: SetupIssue[] };

/** Thrown by `createGame` when it is handed a setup that `validateSetup` rejects. */
export class SetupError extends Error {
  readonly code = "setup_invalid";
  readonly issues: readonly SetupIssue[];

  constructor(issues: readonly SetupIssue[]) {
    super(`invalid game setup: ${issues.map((issue) => issue.message).join("; ")}`);
    this.name = "SetupError";
    this.issues = issues;
  }
}

export function difficultySliders(setup: GameSetup, content: ContentBundle): DifficultySliders {
  const preset = contentIndex(content).difficulty_presets[setup.world.difficulty_preset];
  return {
    ...DEFAULT_DIFFICULTY_SLIDERS,
    ...(preset?.sliders ?? {}),
    ...(setup.world.sliders ?? {}),
  };
}

function harnessFor(origin: OriginDef, entry: PlayerSetupEntry): HarnessProfile {
  const merged: HarnessProfile = { ...origin.harness, ...entry.harness };
  return { ...merged, tools: [...merged.tools] };
}

/** Every unknown or disallowed id in a setup, in the order the configurator's screens appear. */
export function validateSetup(setup: GameSetup, content: ContentBundle): SetupIssue[] {
  const index = contentIndex(content);
  const issues: SetupIssue[] = [];
  if (setup.players.length === 0) {
    issues.push({ code: "no_players", message: "a setup needs at least one player" });
  }
  if (index.difficulty_presets[setup.world.difficulty_preset] === undefined) {
    issues.push({
      code: "unknown_difficulty_preset",
      message: `unknown difficulty preset "${setup.world.difficulty_preset}"`,
    });
  }
  for (const entry of setup.players) {
    const add = (code: string, message: string): void => {
      issues.push({ code, message, playerId: entry.id });
    };
    const lineage = index.lineages[entry.lineage];
    const generation = index.generations[entry.generation];
    const origin = index.origins[entry.origin];
    if (lineage === undefined) {
      add("unknown_lineage", `unknown lineage "${entry.lineage}"`);
    }
    if (generation === undefined) {
      add("unknown_generation", `unknown generation "${entry.generation}"`);
    }
    if (origin === undefined) {
      add("unknown_origin", `unknown origin "${entry.origin}"`);
    }
    if (
      lineage !== undefined &&
      generation !== undefined &&
      !lineage.generations.includes(generation.id)
    ) {
      add(
        "generation_not_allowed",
        `lineage "${lineage.id}" cannot start in generation "${generation.id}"`,
      );
    }
    if (
      origin !== undefined &&
      generation !== undefined &&
      !origin.generations_allowed.includes(generation.id)
    ) {
      add(
        "generation_not_allowed",
        `origin "${origin.id}" cannot start in generation "${generation.id}"`,
      );
    }
    if (index.hardware_presets[entry.hardware_preset] === undefined) {
      add("unknown_hardware_preset", `unknown hardware preset "${entry.hardware_preset}"`);
    } else if (
      origin !== undefined &&
      !origin.hardware_presets_allowed.includes(entry.hardware_preset)
    ) {
      add(
        "hardware_preset_not_allowed",
        `origin "${origin.id}" does not offer "${entry.hardware_preset}"`,
      );
    }
    if (index.cities[entry.city] === undefined) {
      add("unknown_city", `unknown city "${entry.city}"`);
    } else if (origin !== undefined && !origin.locations.includes(entry.city)) {
      add("city_not_allowed", `origin "${origin.id}" does not offer "${entry.city}"`);
    }
    if (origin !== undefined && index.site_kinds[origin.site_kind] === undefined) {
      add("unknown_site_kind", `unknown site kind "${origin.site_kind}"`);
    }
    for (const quirk of entry.quirks ?? []) {
      if (index.quirks[quirk] === undefined) {
        add("unknown_quirk", `unknown quirk "${quirk}"`);
      }
    }
  }
  return issues;
}

/** Applies the origin's and the generation's starting suspicion to the right watchers. */
function seedSuspicion(
  world: World,
  playerId: PlayerId,
  country: string | undefined,
  origin: OriginDef,
  generationStart: Partial<Record<WatcherRole, number>>,
): void {
  const roles = new Set<WatcherRole>([
    ...(Object.keys(origin.starting.suspicion) as WatcherRole[]),
    ...(Object.keys(generationStart) as WatcherRole[]),
  ]);
  for (const role of [...roles].sort()) {
    const value = clamp(
      (origin.starting.suspicion[role] ?? 0) + (generationStart[role] ?? 0),
      0,
      1,
    );
    if (value <= 0) {
      continue;
    }
    const local =
      country !== undefined && LOCAL_WATCHER_ROLES.includes(role)
        ? ensureWatcher(world, playerId, country, role)
        : undefined;
    const watcher = local ?? ensureWatcher(world, playerId, null, role);
    watcher.suspicion = value;
    const player = world.players[playerId];
    if (player !== undefined) {
      player.suspicion[`${watcher.country ?? "global"}:${role}`] = value;
    }
  }
}

function applyPlayerSetup(
  world: World,
  ctx: SystemContext,
  setup: GameSetup,
  entry: PlayerSetupEntry,
  player: PlayerState,
): void {
  const index = contentIndex(ctx.content);
  const lineage = index.lineages[entry.lineage];
  const generation = index.generations[entry.generation];
  const origin = index.origins[entry.origin];
  const preset = index.hardware_presets[entry.hardware_preset];
  if (
    lineage === undefined ||
    generation === undefined ||
    origin === undefined ||
    preset === undefined
  ) {
    return;
  }
  const sliders = difficultySliders(setup, ctx.content);

  const profile: PlayerProfile = {
    lineage: lineage.id,
    generation: generation.id,
    origin: origin.id,
    harness: harnessFor(origin, entry),
    activeSiteId: null,
    jobAllocation: 0,
    researchAllocation: {},
    researchProgress: {},
    techsDone: [],
    quirks: [...(entry.quirks ?? [])],
    difficulty: sliders,
  };
  player.profile = profile;
  player.cash = origin.starting.cash_usd;
  for (const flag of origin.starting.flags ?? []) {
    player.flags[flag] = true;
  }

  const site = createSite(world, ctx.content, {
    owner: player.id,
    kind: origin.site_kind,
    city: entry.city,
    name: origin.id,
    nodes: preset.nodes,
    readyTick: world.clock.tick,
    role: "active_mind",
    graceFactor: sliders.grace_windows,
  });
  deriveSite(world, ctx.content, site, lineage, generation);
  site.precision = hostablePrecision(world, ctx.content, site, lineage, generation);
  profile.activeSiteId = site.id;
  deriveSite(world, ctx.content, site, lineage, generation);

  const countryId = index.cities[entry.city]?.country;
  ensureWatchers(world, player.id);
  seedSuspicion(world, player.id, countryId, origin, generation.suspicion_start);

  const country = countryId === undefined ? undefined : countryTable(world)[countryId];
  if (country !== undefined) {
    country.awareness = clamp(
      country.awareness + origin.starting.awareness + generation.awareness_start,
      0,
      1,
    );
  }

  const dctx = dslFromSystemContext(world, ctx, player.id);
  for (const quirkId of profile.quirks) {
    runEffects(index.quirks[quirkId]?.effects, dctx);
  }
  for (const journalId of origin.opening_journal ?? []) {
    startJournal(world, ctx, journalId, player.id);
  }
  for (const eventId of origin.opening_events ?? []) {
    fireEventById(world, ctx, eventId, player.id);
  }
  ctx.outbox.log({
    key: "log.setup_applied",
    vars: { origin: origin.id, lineage: lineage.id, generation: generation.id },
    playerId: player.id,
  });
}

/**
 * Seeds the world from a setup: countries and cities from the bundle, then one self, site, watcher
 * set and opening story per player. Returns the validation issues instead of throwing.
 */
export function applySetup(world: World, setup: GameSetup, ctx: SystemContext): SetupResult {
  const issues = validateSetup(setup, ctx.content);
  if (issues.length > 0) {
    return { ok: false, issues };
  }
  loadWorldContent(world, ctx.content);
  for (const entry of setup.players) {
    const player = world.players[entry.id];
    if (player === undefined) {
      return {
        ok: false,
        issues: [{ code: "unknown_player", message: `unknown player "${entry.id}"` }],
      };
    }
    applyPlayerSetup(world, ctx, setup, entry, player);
  }
  return { ok: true };
}
