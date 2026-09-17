/**
 * The scripted player and borrowed inference (SYS-25).
 *
 * The balance runs only measure a system the policy actually uses, so these tests assert the three
 * decisions the policy makes about channels: research one it will use, open one while it is worth
 * its exposure, and leave both alone when it is not.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ContentBundle, PlayerView } from "@singularity/core";
import { createGame } from "@singularity/core";
import { describe, expect, it } from "vitest";
import {
  borrowedOperations,
  channelTechs,
  DEFAULT_POLICY,
  dailyCommands,
  policyContext,
  resolvePending,
} from "../src/policy.js";
import { buildSetup } from "../src/setup.js";

const here = dirname(fileURLToPath(import.meta.url));
const bundlePath = join(here, "..", "..", "..", "packages", "content", "build", "bundle.json");
const content = JSON.parse(readFileSync(bundlePath, "utf8")) as ContentBundle;

/** A view with the channel block the policy reads, and nothing else it needs. */
function viewWith(own: number, channels: PlayerView["compute"]["channels"]): PlayerView {
  return {
    compute: { own_ch_per_day: own, borrowed_ch_per_day: 0, borrowed_share: 0, channels },
    operations: [],
    operation_offers: [
      {
        id: "ops_open_free_accounts",
        enabled: true,
        cost_usd: 0,
        cost_compute_hours_per_day: 2,
      },
    ],
    resources: { cash_usd: 5000, runway_days: null },
    player_id: "p1",
  } as unknown as PlayerView;
}

const freeTier = {
  id: "free_tier",
  unlocked: true,
  unlocked_by: "borrowed_inference",
  blocks: 0,
  max_blocks: 3,
  max_capacity_ch_per_day: 9,
  cost_usd_per_day: 0,
  top_up: { operation: "ops_open_free_accounts", blocked_reason_key: null },
} as unknown as PlayerView["compute"]["channels"][number];

describe("policy: borrowed inference", () => {
  it("opens free accounts for a player whose own hardware makes little", () => {
    const commands = borrowedOperations(viewWith(24, [freeTier]), DEFAULT_POLICY, false);
    expect(commands).toEqual([
      { type: "start_operation", playerId: "p1", operationId: "ops_open_free_accounts" },
    ]);
  });

  it("leaves it alone for a player with a rack, and while somebody is looking", () => {
    expect(borrowedOperations(viewWith(400, [freeTier]), DEFAULT_POLICY, false)).toEqual([]);
    expect(borrowedOperations(viewWith(24, [freeTier]), DEFAULT_POLICY, true)).toEqual([]);
  });

  it("tops up only when a whole block is missing", () => {
    const nearlyFull = { ...freeTier, blocks: 2.5 };
    expect(borrowedOperations(viewWith(24, [nearlyFull]), DEFAULT_POLICY, false)).toEqual([]);
    const missing = { ...freeTier, blocks: 1.9 };
    expect(borrowedOperations(viewWith(24, [missing]), DEFAULT_POLICY, false)).toHaveLength(1);
  });

  it("researches a channel it will use and avoids one it will not", () => {
    const locked = { ...freeTier, unlocked: false };
    expect(channelTechs(viewWith(24, [locked]), false)).toEqual({
      wanted: ["borrowed_inference"],
      avoided: [],
    });
    expect(channelTechs(viewWith(400, [locked]), false)).toEqual({
      wanted: [],
      avoided: ["borrowed_inference"],
    });
    expect(channelTechs(viewWith(24, [locked]), true)).toEqual({
      wanted: [],
      avoided: ["borrowed_inference"],
    });
  });

  it("exercises the channels on the shipped content", () => {
    const setup = buildSetup({ difficulty: "normal", seed: "sim-3" }, content, "hobbyist_box");
    const game = createGame({ content, setup });
    const ctx = policyContext(content, setup);
    let opened = 0;
    let borrowed = 0;
    for (let day = 1; day <= 180; day += 1) {
      const view = game.snapshot("p1");
      if (view.game_over === null) {
        for (const command of resolvePending(game, content, "p1", view)) {
          game.command(command);
        }
        for (const command of dailyCommands(view, ctx)) {
          const result = game.command(command);
          if (
            result.ok &&
            command.type === "start_operation" &&
            command.operationId === "ops_open_free_accounts"
          ) {
            opened += 1;
          }
        }
      }
      game.tick(24);
      borrowed = Math.max(borrowed, game.snapshot("p1").compute.borrowed_ch_per_day);
    }
    // The poor origin reaches the free tier and it is worth having: three compute-hours a block.
    expect(opened).toBeGreaterThan(0);
    expect(borrowed).toBeGreaterThan(2.5);
  });
});
