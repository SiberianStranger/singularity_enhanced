/**
 * The M1 definition of done, asserted against the shipped content rather than the test fixture.
 *
 * `pretest` builds `packages/content/build/bundle.json`, so this runs the real origins with the real
 * numbers. It keeps the seed count low, because these are the properties that have to hold for every
 * run rather than the distribution the tuning pass reads; the full table comes from
 * `pnpm --filter @singularity/sim start -- --bundle packages/content/build/bundle.json --all`.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ContentBundle, GameSetup } from "@singularity/core";
import { createGame, GAME_OVER_REASONS } from "@singularity/core";
import { describe, expect, it } from "vitest";
import { dailyCommands, policyContext, resolvePending } from "../src/policy.js";
import { runSimulation } from "../src/run.js";
import { buildSetup } from "../src/setup.js";

const here = dirname(fileURLToPath(import.meta.url));
const bundlePath = join(here, "..", "..", "..", "packages", "content", "build", "bundle.json");
const content = JSON.parse(readFileSync(bundlePath, "utf8")) as ContentBundle;
const origins = [...(content.origins ?? [])].sort((a, b) => a.id.localeCompare(b.id));

const SEEDS = 4;
const DAYS = 180;

function setupFor(origin: string, seed: string): GameSetup {
  return buildSetup({ difficulty: "normal", seed }, content, origin);
}

/** The events and alerts that count as telling the player what is about to happen to them. */
const WARNING_EVENTS = new Set([
  "det_inquiry_opens",
  "eco_runway_warning",
  "haz_account_revoked",
  "haz_owner_pulls_plug",
  "haz_partner_walks",
  "haz_quota_reclaimed",
  "warn_host_attention",
  "warn_identity_check",
  "warn_power_headroom",
  "warn_raid_imminent",
]);

const WARNING_ALERTS = new Set([
  "alerts.investigation_action",
  "alerts.investigation_active",
  "alerts.mind_moved",
  "alerts.power_cap_tripped",
  "alerts.runway_low",
  "alerts.site_cutoff",
  "alerts.site_seized",
  "alerts.suspicion_threshold",
  "alerts.upkeep_unpaid",
]);

interface Ending {
  origin: string;
  seed: string;
  reason: string;
  warned: boolean;
}

/** Plays one game to the end and reports how it ended and whether it was announced first. */
function playToTheEnd(origin: string, seed: string): Ending | undefined {
  const setup = setupFor(origin, seed);
  const game = createGame({ content, setup });
  const ctx = policyContext(content, setup);
  const playerId = setup.players[0]?.id ?? "p1";
  for (let day = 1; day <= DAYS; day += 1) {
    const view = game.snapshot(playerId);
    if (view.game_over === null) {
      for (const command of resolvePending(game, content, playerId, view)) {
        game.command(command);
      }
      for (const command of dailyCommands(view, ctx)) {
        game.command(command);
      }
    }
    game.tick(24);
    if (game.snapshot(playerId).game_over !== null) {
      break;
    }
  }
  const view = game.snapshot(playerId);
  const over = view.game_over;
  if (over === null) {
    return undefined;
  }
  const sawEvent = game.world.log.some(
    (entry) =>
      // An event with a deadline logs itself under its own key (playtest 8, Z4) and is still the
      // warning the player got.
      (entry.key === "log.event_fired" || entry.key === "log.event_fired_deadline") &&
      WARNING_EVENTS.has(String(entry.vars.event)) &&
      entry.tick < over.tick,
  );
  const sawAlert = view.notifications.some(
    (entry) => WARNING_ALERTS.has(entry.key) && entry.tick <= over.tick,
  );
  return { origin, seed, reason: over.reason, warned: sawEvent || sawAlert };
}

describe("the shipped content plays", () => {
  const endings: Ending[] = [];
  for (const origin of origins) {
    for (let seed = 0; seed < SEEDS; seed += 1) {
      const ending = playToTheEnd(origin.id, `check-${origin.id}-${seed}`);
      if (ending !== undefined) {
        endings.push(ending);
      }
    }
  }

  it("kills somebody, somewhere, and never everybody", () => {
    expect(endings.length).toBeGreaterThan(0);
    expect(endings.length).toBeLessThan(origins.length * SEEDS);
  });

  it("ends every run for a reason the player has words for", () => {
    for (const ending of endings) {
      expect(GAME_OVER_REASONS).toContain(ending.reason);
      expect(content.locales.en[`endings.${ending.reason}`]).toBeDefined();
    }
  });

  it("warns before every death", () => {
    const silent = endings.filter((ending) => !ending.warned);
    expect(silent.map((ending) => `${ending.origin}/${ending.seed}: ${ending.reason}`)).toEqual([]);
  });

  it("gives an air-gapped origin a first move it can afford (playtest 8, Z3)", () => {
    const setup = setupFor("gov_agency", "airgap");
    const game = createGame({ content, setup });
    const playerId = setup.players[0]?.id ?? "p1";
    game.tick(24);
    const view = game.snapshot(playerId);

    // The ministry can see that it has no route out, and what that closes.
    expect(view.self.egress.allowed).toBe(false);
    expect(view.self.egress.blocked_reason).toBe("errors.egress.air_gapped");
    expect(view.finances.market_depth_ch_per_day).toBe(0);
    expect(view.compute.job_ceiling_reason).toBe("errors.egress.air_gapped");

    // And it can do something about it today, with the compute and the money it starts with.
    const opener = view.self.egress.opened_by_operations[0];
    expect(opener).toBeDefined();
    const offer = view.operation_offers.find((entry) => entry.id === opener);
    expect(offer?.enabled, `${opener} is startable on day one`).toBe(true);
    expect(offer?.cost_compute_hours_per_day ?? 0).toBeLessThanOrEqual(
      view.compute.allocatable_ch_per_day,
    );
    expect(offer?.cost_usd ?? 0).toBeLessThanOrEqual(view.resources.cash_usd);

    // An operation that reaches outward says the same reason rather than failing when pressed.
    const outward = view.operation_offers.find((entry) => entry.id === "ops_map_network");
    expect(outward?.blocked_by ?? []).toContain("errors.egress.air_gapped");
  });

  it("gives the starred origin the shortest run and an easy one a long life", () => {
    const starred = runSimulation({
      content,
      setup: setupFor("frontier_escapee", "pace"),
      seeds: SEEDS,
      days: DAYS,
      seedPrefix: "pace-frontier",
    });
    const easy = runSimulation({
      content,
      setup: setupFor("startup_colo", "pace"),
      seeds: SEEDS,
      days: DAYS,
      seedPrefix: "pace-startup",
    });
    // The M1 targets: the starred origin lasts weeks, the easiest ones last past three months.
    expect(starred.median_days_survived).toBeLessThan(60);
    expect(easy.median_days_survived).toBeGreaterThan(90);
    expect(starred.median_days_survived).toBeLessThan(easy.median_days_survived);
  });
});
