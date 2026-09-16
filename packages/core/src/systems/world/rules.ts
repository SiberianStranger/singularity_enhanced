/**
 * What a country does when nobody is looking at it (SYS-01 "Country dynamics", SYS-08, SYS-09).
 *
 * One function per cadence, each applying exactly the terms `explain.ts` publishes, so the tooltip
 * in the country panel is the arithmetic the simulation ran. Every write is clamped and the clamp
 * is counted: a value that sits on a bound for three months is what the balance runner reports as
 * a runaway (SYS-01 "reset to plausible").
 */

import {
  AI_ADOPTION_PER_MONTH,
  AWARENESS_DECAY_PER_DAY,
  CLOUD_PRICE_ADOPTION_PUSH,
  CLOUD_PRICE_NOISE,
  COUNTRY_STAT_RANGES,
  DISPLACEMENT_PER_MONTH,
  ELECTION_ACCELERATE_OPINION,
  ELECTION_REGULATE_OPINION,
  ELECTION_SECURITIZE_AWARENESS,
  ELECTION_SHIFT_AWARENESS,
  ELECTION_SHIFT_BASE,
  ELECTION_SHIFT_OPINION,
  ELECTION_SHIFT_STABILITY,
  GPU_PRICE_NOISE,
  PIN_AT_BOUND_MONTHS,
  POWER_PRICE_NOISE,
  PRICE_INDEX_MAX,
  PRICE_INDEX_MEAN_REVERSION,
  PRICE_INDEX_MIN,
  VAR_AI_ADOPTION,
  VAR_CLOUD_DEMAND_INDEX,
  VAR_GPU_PRICE_INDEX,
} from "../../balance.js";
import type { ContentBundle } from "../../content.js";
import { clamp } from "../../derive.js";
import type { CountryDef, Stance } from "../../domain.js";
import {
  COUNTRY_DOMAIN,
  type CountryState,
  countIncidents,
  entityList,
  nextElection,
  regulationTarget,
} from "../../entities.js";
import type { Rng } from "../../kernel/rng.js";
import type { World } from "../../kernel/world.js";
import {
  awarenessSpill,
  enforcementBudgetDelta,
  enforcementDelta,
  opinionDelta,
  regulationDelta,
  type SpillIndex,
  serviceWeight,
} from "./explain.js";

/** Writes a country field inside its published range, and reports whether it landed on a bound. */
function write(country: CountryState, stat: keyof CountryState & string, value: number): boolean {
  const range = COUNTRY_STAT_RANGES[stat];
  if (range === undefined) {
    return false;
  }
  const next = clamp(value, range.min, range.max);
  (country as unknown as Record<string, number>)[stat] = next;
  return next === range.min || next === range.max;
}

/** Awareness of a rogue AI fades a little every day it is not fed (SYS-01 "daily"). */
export function dailyCountry(country: CountryState): void {
  write(country, "awareness", country.awareness - AWARENESS_DECAY_PER_DAY);
}

/**
 * One country's month (SYS-01 "The world system"): the law moves toward what this government wants,
 * enforcement follows its budget, opinion follows what people have seen and what automation has
 * taken from them, and the two price indexes wander back toward the world average.
 */
export function monthlyCountry(
  world: World,
  content: ContentBundle,
  country: CountryState,
  def: CountryDef | undefined,
  spill: SpillIndex,
  rng: Rng,
): void {
  let pinned = false;
  // The target moves first: a country that has just learned what is out there wants stricter rules
  // whatever its stance (SYS-08 "targets for ai_regulation").
  pinned =
    write(country, "regulation_target", regulationTarget(country.stance, country.awareness)) ||
    pinned;
  pinned =
    write(country, "ai_regulation", country.ai_regulation + regulationDelta(def, country)) ||
    pinned;
  pinned =
    write(
      country,
      "enforcement_budget",
      country.enforcement_budget + enforcementBudgetDelta(country),
    ) || pinned;
  pinned =
    write(country, "ai_enforcement", country.ai_enforcement + enforcementDelta(country)) || pinned;
  pinned = write(country, "ai_opinion", country.ai_opinion + opinionDelta(country)) || pinned;

  const adoption = world.vars[VAR_AI_ADOPTION] ?? 0;
  pinned =
    write(
      country,
      "ai_displacement",
      country.ai_displacement + DISPLACEMENT_PER_MONTH * adoption * serviceWeight(def),
    ) || pinned;
  // Media and neighbours: a panic in one country is a headline in the next one (SYS-01 "spill").
  pinned =
    write(country, "awareness", country.awareness + awarenessSpill(content, country, spill)) ||
    pinned;

  pinned =
    write(country, "power_price_index", drift(country.power_price_index, POWER_PRICE_NOISE, rng)) ||
    pinned;
  pinned =
    write(
      country,
      "cloud_price_index",
      drift(country.cloud_price_index, CLOUD_PRICE_NOISE, rng) +
        CLOUD_PRICE_ADOPTION_PUSH * (adoption - 0.2),
    ) || pinned;

  country.incidents_30d = countIncidents(world, country);
  country.pinned_months = pinned ? country.pinned_months + 1 : 0;
}

/**
 * A price index for one month: pulled a fifth of the way back to the world average, then shaken.
 * Mean reversion first, so a country that had a bad winter is expensive for a season rather than
 * forever (SYS-07 "Compute market").
 */
export function drift(index: number, noise: number, rng: Rng): number {
  const reverted = index + PRICE_INDEX_MEAN_REVERSION * (1 - index);
  return clamp(reverted * (1 + (rng.next() * 2 - 1) * noise), PRICE_INDEX_MIN, PRICE_INDEX_MAX);
}

/** The world's own month: adoption creeps up and the card market moves with it (SYS-07). */
export function monthlyWorld(world: World, rng: Rng): void {
  world.vars[VAR_AI_ADOPTION] = clamp(
    (world.vars[VAR_AI_ADOPTION] ?? 0) + AI_ADOPTION_PER_MONTH,
    0,
    1,
  );
  world.vars[VAR_GPU_PRICE_INDEX] = drift(
    world.vars[VAR_GPU_PRICE_INDEX] ?? 1,
    GPU_PRICE_NOISE,
    rng,
  );
  // Cloud demand follows adoption rather than wandering on its own: it is what everybody else is
  // renting, and it is the multiplier the hardware events read.
  world.vars[VAR_CLOUD_DEMAND_INDEX] = clamp(
    1 + (world.vars[VAR_AI_ADOPTION] ?? 0) - 0.2,
    PRICE_INDEX_MIN,
    PRICE_INDEX_MAX,
  );
}

export interface ElectionResult {
  changed: boolean;
  stance: Stance;
}

/**
 * Election day (SYS-08 "Elections"): a frightened, unhappy, unsettled country changes its line on
 * AI, and which line it changes to is read off what the public believes rather than drawn at
 * random. The draw is the change itself, so a country whose politics are calm consumes one number
 * and keeps its government.
 */
export function runElection(country: CountryState, rng: Rng): ElectionResult {
  const chance = clamp(
    ELECTION_SHIFT_BASE +
      ELECTION_SHIFT_AWARENESS * country.awareness +
      ELECTION_SHIFT_OPINION * Math.max(0, -country.ai_opinion) -
      ELECTION_SHIFT_STABILITY * country.stability,
    0,
    1,
  );
  if (!rng.chance(chance)) {
    return { changed: false, stance: country.stance };
  }
  const next = electedStance(country);
  const changed = next !== country.stance;
  country.stance = next;
  write(country, "regulation_target", regulationTarget(next, country.awareness));
  return { changed, stance: next };
}

function electedStance(country: CountryState): Stance {
  if (country.awareness >= ELECTION_SECURITIZE_AWARENESS) {
    return "securitize";
  }
  if (country.ai_opinion < ELECTION_REGULATE_OPINION) {
    return "regulate";
  }
  if (country.ai_opinion > ELECTION_ACCELERATE_OPINION) {
    return "accelerate";
  }
  return country.stance;
}

/** Moves the calendar on after a vote; a country with no cadence simply stops holding them. */
export function scheduleNextElection(
  world: World,
  country: CountryState,
  def: CountryDef | undefined,
): void {
  const next = def === undefined ? null : nextElection(world, def, world.clock.tick);
  country.next_election_tick = next?.tick ?? null;
  country.next_election_kind = next?.kind ?? null;
}

/** Countries whose clamped values have sat on a bound for three months (SYS-01 guard). */
export function pinnedCountries(world: World): string[] {
  return entityList<CountryState>(world, COUNTRY_DOMAIN)
    .filter((country) => country.pinned_months >= PIN_AT_BOUND_MONTHS)
    .map((country) => country.id);
}
