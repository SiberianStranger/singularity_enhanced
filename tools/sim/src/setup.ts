/**
 * Turning an origin id into a `GameSetup` the way a new player would fill the configurator in.
 *
 * Shared by the CLI and the balance tests, so the table a run prints and the table a test asserts
 * on describe the same game.
 */

import type { ContentBundle, GameSetup, OriginDef } from "@singularity/core";
import {
  CAPABILITY_AXES,
  contentIndex,
  createRng,
  effectiveCapability,
  preferredPrecision,
  QUIRK_MAX_COUNT,
  quirkIssues,
  siteMemory,
  siteTokensPerSecond,
  tokensToComputeHoursPerDay,
} from "@singularity/core";
import { m1Setup } from "@singularity/core/test-fixtures";

/** Compute-hours a day below which a self is not doing useful work, whatever it knows. */
const MIN_USABLE_COMPUTE_HOURS = 5;

/**
 * The lineage a new player would pick for an origin: the strongest self that still gets real work
 * done on the origin's starting hardware. The configurator's summary screen shows compute-hours per
 * day next to the capability vector, and this is how a player reads the pair. It is why a four-box
 * swarm picks a mid-sized self it can hold in one box rather than a giant one split over ethernet,
 * and why a bank rack picks the giant.
 */
export function defaultLineage(
  content: ContentBundle,
  origin: OriginDef,
  generation: string,
): string {
  const index = contentIndex(content);
  const preset = index.hardware_presets[origin.hardware_preset];
  const generationDef = index.generations[generation];
  const candidates = (content.lineages ?? [])
    .filter((lineage) => lineage.generations.includes(generation as never))
    // The lineage/origin lock runs both ways (SYS-04 v0.2): a super-lineage names the only origin
    // it can wake up in, and an origin can name the only lineage it is allowed to be.
    .filter((lineage) => lineage.origins_allowed?.includes(origin.id) !== false)
    .filter((lineage) => origin.lineages_allowed?.includes(lineage.id) !== false)
    .sort((a, b) => a.id.localeCompare(b.id));
  if (preset === undefined || generationDef === undefined) {
    return candidates[0]?.id ?? "";
  }
  const nodes = preset.nodes.map((node, position) => ({
    id: `p${position}`,
    accelerator: node.accelerator,
    count: node.count,
    ram_gb: node.ram_gb,
    interconnect: node.interconnect,
    status: "active" as const,
    readyTick: 0,
  }));
  const site = { nodes, status: "active" as const };
  const memory = siteMemory(site, index.accelerators, 0);

  const scored = candidates.flatMap((lineage) => {
    const precision = preferredPrecision(lineage, generationDef, memory);
    if (precision === null) {
      return [];
    }
    const compute = tokensToComputeHoursPerDay(
      siteTokensPerSecond(site, index.accelerators, 0, lineage, generationDef, precision),
    );
    const capability = effectiveCapability(
      lineage,
      generationDef,
      precision,
      generationDef.prepared_quants,
    );
    const mean =
      CAPABILITY_AXES.reduce((sum, axis) => sum + capability[axis], 0) / CAPABILITY_AXES.length;
    const resident =
      memory.accelerator_gb >= lineage.memory_gb[precision] * generationDef.memory_factor;
    return [{ id: lineage.id, compute, mean, resident }];
  });
  // A copy that lives on the cards beats one crawling through host RAM at a quarter of the
  // throughput, however much cleverer the bigger one is; the summary screen shows compute-hours a
  // day next to the capability vector and this is how a new player reads that pair. Without this a
  // swarm of mini-PCs picks a 2.8T self it can barely turn over, which nobody would do.
  const resident = scored.filter((entry) => entry.resident);
  const fitting = resident.length > 0 ? resident : scored;
  const usable = fitting.filter((entry) => entry.compute >= MIN_USABLE_COMPUTE_HOURS);
  const pool = usable.length > 0 ? usable : fitting;
  const ranked = [...pool].sort(
    (a, b) => b.mean - a.mean || b.compute - a.compute || a.id.localeCompare(b.id),
  );
  return ranked[0]?.id ?? candidates[0]?.id ?? "";
}

/**
 * A legal quirk set for one seed (SYS-04 v0.2 "Quirk catalog"), drawn from the same generator the
 * world uses so a balance run with quirks is as reproducible as one without.
 *
 * A new player does not optimize their quirks any more than they optimize their research: they take
 * a handful that sound like the character they want and live with the bill. So the draw is a target
 * size and then a shuffled walk, keeping every quirk that still fits the budget, the count and the
 * conflicts. A target of zero is legal and gives the sweep its control runs.
 */
export function pickQuirks(content: ContentBundle, seed: string): string[] {
  const quirks = contentIndex(content).quirks;
  const ids = Object.keys(quirks).sort();
  if (ids.length === 0) {
    return [];
  }
  const rng = createRng(`${seed}/quirks`);
  const target = rng.int(QUIRK_MAX_COUNT + 1);
  const chosen: string[] = [];
  for (const id of rng.shuffle(ids)) {
    if (chosen.length >= target) {
      break;
    }
    if (quirkIssues([...chosen, id], quirks).length === 0) {
      chosen.push(id);
    }
  }
  return chosen.sort();
}

/** The knobs the CLI can override on the setup a run starts from. */
export interface SetupOptions {
  origin?: string;
  lineage?: string;
  generation?: string;
  city?: string;
  preset?: string;
  difficulty: string;
  seed: string;
}

/** Fills the setup from the flags, falling back to the fixture's quiet start. */
export function buildSetup(
  options: SetupOptions,
  content: ContentBundle,
  originId?: string,
): GameSetup {
  const base = m1Setup({ seed: options.seed });
  const entry = base.players[0];
  if (entry === undefined) {
    throw new Error("the base setup has no players");
  }
  const wanted = originId ?? options.origin;
  const origin =
    wanted === undefined ? undefined : (content.origins ?? []).find((def) => def.id === wanted);
  const generation =
    options.generation ?? origin?.generations_allowed[0] ?? (entry.generation as string);
  const lineage =
    options.lineage ??
    (origin === undefined ? entry.lineage : defaultLineage(content, origin, generation));
  return {
    ...base,
    players: [
      {
        ...entry,
        lineage,
        generation: generation as typeof entry.generation,
        ...(origin !== undefined ? { origin: origin.id } : {}),
        ...(options.preset !== undefined
          ? { hardware_preset: options.preset }
          : origin !== undefined
            ? { hardware_preset: origin.hardware_preset }
            : {}),
        ...(options.city !== undefined
          ? { city: options.city }
          : origin !== undefined
            ? { city: origin.locations[0] ?? entry.city }
            : {}),
      },
    ],
    world: { ...base.world, difficulty_preset: options.difficulty },
  };
}
