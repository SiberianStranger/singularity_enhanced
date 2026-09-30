/**
 * The scripted player and the 0.2.0 hardware (SYS-02 "playable archetypes", SYS-07 "Balance notes
 * (0.3.1)").
 *
 * Release 0.2.0 put research gates on the rigs, added two rigs that are only rented, retired
 * `buy_hardware` for bundles that sell configurations, and made a configuration the way a place
 * grows. The balance runner read none of it, and the table moved for that reason alone. These
 * tests hold the runner to the rules `build_site` and `order_equipment` enforce.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type {
  ContentBundle,
  EquipmentOfferView,
  HardwarePresetDef,
  PlayerView,
  SiteView,
} from "@singularity/core";
import { contentIndex, createGame } from "@singularity/core";
import { describe, expect, it } from "vitest";
import {
  dailyCommands,
  fillOrder,
  growthOrder,
  NOTHING_UNLOCKED,
  planSecondSite,
  plansFor,
  policyContext,
  resolvePending,
  type Unlocks,
} from "../src/policy.js";
import { buildSetup, pickQuirks } from "../src/setup.js";

const here = dirname(fileURLToPath(import.meta.url));
const bundlePath = join(here, "..", "..", "..", "packages", "content", "build", "bundle.json");
const content = JSON.parse(readFileSync(bundlePath, "utf8")) as ContentBundle;
const index = contentIndex(content);
const origins = [...(content.origins ?? [])].map((origin) => origin.id).sort();

function setupFor(origin: string, seed = "equipment") {
  return buildSetup({ difficulty: "normal", seed }, content, origin);
}

/** What `build_site` and `order_equipment` check before they take any money. */
function open(
  gated: {
    requires?: readonly string[];
    reveal_after?: readonly string[];
    requires_company?: boolean;
  },
  unlocks: Unlocks,
): boolean {
  return (
    [...(gated.requires ?? []), ...(gated.reveal_after ?? [])].every((id) =>
      unlocks.techs.has(id),
    ) &&
    (gated.requires_company !== true || unlocks.company)
  );
}

/** A view with only what the planner and the fill read. */
function viewWith(done: string[], extra: Record<string, unknown> = {}): PlayerView {
  return {
    player_id: "p1",
    research: { done },
    finances: { identities: [] },
    ...extra,
  } as unknown as PlayerView;
}

function offer(
  id: string,
  cost: number,
  fields: Partial<EquipmentOfferView> & { gain?: number } = {},
): EquipmentOfferView {
  const { gain = 1, ...rest } = fields;
  return {
    id,
    slot: "compute",
    prototype: false,
    blocked_reason: null,
    cost_usd: cost,
    preview: {
      memory_gb: 0,
      memory_before_gb: 0,
      power_kw: 0,
      power_capacity_kw: null,
      cooling_capacity_kw: null,
      compute_before: 10,
      compute_after: 10 + gain,
      fits_self: false,
    },
    ...rest,
  } as EquipmentOfferView;
}

function siteWith(
  presetNodes: HardwarePresetDef["nodes"],
  offers: EquipmentOfferView[],
  fields: Partial<SiteView> = {},
): SiteView {
  return {
    id: "s2",
    kind: "residential",
    name: "fallback 2",
    name_is_literal: true,
    status: "active",
    role: "none",
    best_precision: null,
    nodes: presetNodes.map((node, position) => ({
      id: `n${position}`,
      accelerator: node.accelerator,
      count: node.count,
      ram_gb: node.ram_gb,
      status: "active",
      ready_tick: 0,
    })),
    equipment: { slots: [], offers, orders: [] },
    ...fields,
  } as unknown as SiteView;
}

describe("the planner reads the gates 0.2.0 put on the rigs", () => {
  const unlockSets: Unlocks[] = [
    NOTHING_UNLOCKED,
    { techs: new Set(["cpu_offload"]), company: false },
    {
      techs: new Set([
        "cpu_offload",
        "remote_access",
        "remote_operations",
        "multi_node_inference",
        "exploit_discovery",
        "identity_layering",
        "synthetic_identities",
        "hardware_sourcing",
      ]),
      company: false,
    },
  ];

  it("never plans a rig or a configuration the player has not opened, for any origin", () => {
    for (const origin of origins) {
      for (const unlocks of unlockSets) {
        for (const usable of [false, true]) {
          const plan = planSecondSite(content, setupFor(origin), usable, unlocks);
          if (plan === undefined) {
            continue;
          }
          const preset = index.hardware_presets[plan.preset];
          const kind = index.site_kinds[plan.kind];
          expect(preset, `${origin}: ${plan.preset}`).toBeDefined();
          expect(kind?.ownership === "owned" || kind?.ownership === "rented").toBe(true);
          expect(open(preset ?? {}, unlocks), `${origin}: ${plan.preset}`).toBe(true);
          // A rig nobody sells is only ever rented, and only where it is rented.
          if (preset?.purchasable === false) {
            expect(preset.rental_only === true && kind?.ownership === "rented").toBe(true);
          }
          for (const id of plan.orders) {
            const def = index.equipment[id];
            expect(def?.slot).toBe("compute");
            expect(def?.site_kinds).toContain(plan.kind);
            expect(open(def ?? {}, unlocks), `${origin}: ${id}`).toBe(true);
          }
        }
      }
    }
  });

  it("gives the hobbyist a rig it can buy, not a rented accelerator for its flat", () => {
    // 0.2.0's rental-only rigs are priced at 650 and 450, and the planner that did not read
    // `purchasable` took one as the cheapest place a hobbyist could own.
    const plan = planSecondSite(content, setupFor("hobbyist_box"));
    expect(plan?.kind).toBe("residential");
    expect(index.hardware_presets[plan?.preset ?? ""]?.rental_only).not.toBe(true);
    expect(plan?.orders).toEqual([]);
  });

  it("houses a self no rig on sale can hold with configurations, priced with them", () => {
    // Nothing the bank can buy on day one holds 879 GB: the grey-market farm is behind hardware
    // sourcing. A place filled with appliances is what the site window offers instead.
    const plan = planSecondSite(content, setupFor("bank_rack"));
    expect(plan).toBeDefined();
    expect(plan?.orders.length).toBeGreaterThan(0);
    expect(plan?.cost).toBeGreaterThan(index.hardware_presets[plan?.preset ?? ""]?.cost_usd ?? 0);
    expect(new Set(plan?.orders).size).toBe(1);
  });

  it("plans again when research opens a rig", () => {
    const ctx = policyContext(content, setupFor("state_lab"));
    const before = plansFor(ctx, viewWith([])).plan;
    const after = plansFor(ctx, viewWith(["cpu_offload"])).plan;
    // Before CPU offload the institute has to fill a colocation cage with appliances; after it,
    // one studio machine in a flat holds the self.
    expect(before?.orders.length).toBeGreaterThan(0);
    expect(after?.preset).toBe("ghost_in_the_studio");
    expect(after?.orders).toEqual([]);
    // The plans are kept, not made again every day.
    expect(plansFor(ctx, viewWith(["cpu_offload", "some_unrelated_tech"]))).toBe(
      plansFor(ctx, viewWith(["cpu_offload"])),
    );
  });
});

describe("the fill and the growth are bought the way the site window sells them", () => {
  const scrapyard = index.hardware_presets.scrapyard_oracle?.nodes ?? [];
  // The ministry's 753B at int2: 206 GB of weights.
  const self = { self: { precision_options: [{ memory_gb: 206 }, { memory_gb: 412 }] } };

  it("finishes a place it bought with the configuration that holds the self for least", () => {
    const offers = [
      offer("quiet_amd", 2800),
      offer("vintage_p40", 900),
      offer("quiet_apple", 6200, {
        blocked_reason: { key: "equipment.error.research", vars: {} },
      }),
    ];
    const order = fillOrder(viewWith([], self), siteWith(scrapyard, offers), 50_000, content);
    // One Ryzen appliance puts the copy on the cards; the P40 reaches it only through host RAM,
    // which the planner counts at three times the price, and the refused Apple is not on offer.
    expect(order).toEqual({
      type: "order_equipment",
      playerId: "p1",
      siteId: "s2",
      equipmentId: "quiet_amd",
    });
  });

  it("saves for it rather than buying something else, and stops once the self fits", () => {
    const offers = [offer("quiet_amd", 2800)];
    expect(fillOrder(viewWith([], self), siteWith(scrapyard, offers), 1_000, content)).toBe(
      undefined,
    );
    const done = siteWith([...scrapyard, ...(index.equipment.quiet_amd?.nodes ?? [])], offers);
    expect(fillOrder(viewWith([], self), done, 50_000, content)).toBe(undefined);
  });

  it("grows only with a configuration that adds compute the self can use", () => {
    const useless = offer("vintage_p40", 900, { gain: 0 });
    const useful = offer("quiet_amd", 2800, { gain: 12 });
    const mind = siteWith(scrapyard, [useless, useful], { role: "active_mind" });
    expect(growthOrder(viewWith([]), mind, 20_000)?.type).toBe("order_equipment");
    expect(growthOrder(viewWith([]), siteWith(scrapyard, [useless]), 20_000)).toBe(undefined);
    // Four times the price beyond the reserve, as the card-by-card growth move asked.
    expect(growthOrder(viewWith([]), mind, 11_000)).toBe(undefined);
    // A host's machine offers nothing the player may install.
    const managed = offer("quiet_amd", 2800, {
      gain: 12,
      blocked_reason: { key: "equipment.error.managed", vars: {} },
    });
    expect(growthOrder(viewWith([]), siteWith(scrapyard, [managed]), 20_000)).toBe(undefined);
  });
});

describe("the runner on the shipped content", () => {
  it("never sends a command 0.2.0 retired or a rig it cannot buy", () => {
    const refused: string[] = [];
    let ordered = 0;
    for (const origin of ["bank_rack", "gov_agency", "hobbyist_box"]) {
      const setup = setupFor(origin, `sim-${origin}-0`);
      const seeded = {
        ...setup,
        seed: `sim-${origin}-0`,
        players: setup.players.map((entry) => ({
          ...entry,
          quirks: pickQuirks(content, `sim-${origin}-0`),
        })),
      };
      const game = createGame({ content, setup: seeded });
      const ctx = policyContext(content, seeded);
      for (let day = 1; day <= 60; day += 1) {
        const view = game.snapshot("p1");
        if (view.game_over !== null) {
          break;
        }
        for (const command of resolvePending(game, content, "p1", view)) {
          game.command(command);
        }
        for (const command of dailyCommands(view, ctx)) {
          const result = game.command(command);
          if (command.type === "buy_hardware") {
            refused.push(`${origin} day ${day}: buy_hardware`);
          }
          if (command.type === "build_site" || command.type === "order_equipment") {
            if (!result.ok) {
              refused.push(`${origin} day ${day}: ${command.type} ${result.error?.key}`);
            } else if (command.type === "order_equipment") {
              ordered += 1;
            }
          }
        }
        game.tick(24);
      }
    }
    expect(refused).toEqual([]);
    // The bank has no rig on sale that holds it, so it fills a place with appliances.
    expect(ordered).toBeGreaterThan(0);
  });
});
