/** Shipped configuration data exercised through the real command and snapshot boundary. */
import { readFile } from "node:fs/promises";
import {
  buildEquipmentView,
  createComputeSystem,
  createGame,
  createSite,
  type EquipmentDef,
  type Game,
  type PlayerState,
  playerBalance,
  quoteEquipment,
  siteTable,
} from "@singularity/core";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { StartPresetDefSchema } from "../schemas/presets.js";
import { buildContent, formatIssues } from "../src/build.js";

const result = await buildContent();
const bundle = result.bundle;
const equipment = bundle.equipment ?? [];
const originalCatalog = parse(
  await readFile(new URL("../data/hardware/accelerators.yaml", import.meta.url), "utf8"),
) as { id: string }[];
const startPresets = StartPresetDefSchema.array().parse(
  parse(await readFile(new URL("../data/presets/presets.yaml", import.meta.url), "utf8")),
);

function start() {
  const preset = startPresets.find((entry) => entry.id === "home_lab");
  if (preset === undefined) throw new Error("Missing shipped home_lab preset");
  const origin = bundle.origins?.find((entry) => entry.id === preset.origin);
  const city = preset.city ?? origin?.locations[0];
  if (city === undefined) throw new Error("Missing home_lab city");
  // The real initial configuration, equipment data and hourly compute system are retained.
  // Other systems are excluded so a long manufacturing assertion cannot depend on random raids.
  const game = createGame({
    content: bundle,
    systems: [createComputeSystem()],
    setup: {
      seed: "shipped-equipment",
      players: [
        {
          id: "p1",
          name: "Engineer",
          lineage: preset.lineage,
          generation: preset.generation,
          origin: preset.origin,
          hardware_preset: preset.hardware,
          city,
        },
      ],
      world: { difficulty_preset: "normal" },
    },
  });
  const player = game.world.players.p1;
  const site = Object.values(siteTable(game.world)).find((entry) => entry.owner === "p1");
  if (player === undefined || site === undefined) throw new Error("Missing initial player or site");
  player.cash = 100_000_000;
  return { game, player, site };
}

function grant(player: PlayerState, ids: readonly string[]): void {
  if (player.profile === null) throw new Error("Missing player profile");
  for (const id of ids) {
    expect(
      bundle.techs.some((tech) => tech.id === id),
      `real technology ${id}`,
    ).toBe(true);
    if (!player.profile.techsDone.includes(id)) player.profile.techsDone.push(id);
  }
}

function definition(id: string): EquipmentDef {
  const found = equipment.find((entry) => entry.id === id);
  if (found === undefined) throw new Error(`Missing equipment ${id}`);
  return found;
}

function order(game: Game, siteId: string, equipmentId: string) {
  return game.command({ type: "order_equipment", playerId: "p1", siteId, equipmentId });
}

describe("shipped equipment: manageable catalog and preserved factual records", () => {
  it("builds fourteen singular archetypes, with four initially revealed and at most two variants", () => {
    expect(formatIssues(result.issues)).toBe("");
    expect(result.ok).toBe(true);
    const compute = equipment.filter((entry) => entry.slot === "compute");
    const groups = new Map<string, EquipmentDef[]>();
    for (const item of compute)
      groups.set(item.archetype, [...(groups.get(item.archetype) ?? []), item]);
    expect(groups.size).toBe(14);
    for (const [id, variants] of groups) {
      expect(variants.length, id).toBeLessThanOrEqual(2);
      expect(new Set(variants.map((entry) => entry.name_key)).size, id).toBe(1);
    }
    const { game, site } = start();
    const visible = buildEquipmentView(game.world, bundle, site).offers.filter(
      (offer) => offer.slot === "compute",
    );
    expect([...new Set(visible.map((offer) => offer.archetype))].sort()).toEqual([
      "consumer_workhorse",
      "mining_frankenstein",
      "quiet_desktop",
      "server_vintage",
    ]);
    expect(game.snapshot("p1").catalog?.accelerators).toEqual([]);
    for (const item of equipment) {
      for (const key of [item.name_key, item.desc_key, item.tradeoff_key, item.variant_key].filter(
        (key): key is string => key !== undefined,
      )) {
        expect(bundle.locales.en[key], `en/${key}`).toBeTruthy();
        expect(bundle.locales.ru?.[key], `ru/${key}`).toBeTruthy();
      }
    }
  });

  it("retains all 94 source products and adds only three explicitly authored player products", () => {
    expect(originalCatalog).toHaveLength(94);
    const actual = bundle.accelerators ?? [];
    expect(actual).toHaveLength(97);
    const realIds = new Set(originalCatalog.map((entry) => entry.id));
    expect(actual.filter((entry) => realIds.has(entry.id))).toHaveLength(94);
    expect(
      actual
        .filter((entry) => !realIds.has(entry.id))
        .map((entry) => entry.id)
        .sort(),
    ).toEqual(["player_inference_module", "player_integrated_module", "player_mature_tensor"]);
    for (const item of actual.filter((entry) => !realIds.has(entry.id))) {
      expect(item.vendor).toBe("Player design");
      expect(item.arch).toContain("Game fiction:");
      expect(item.cloud_usd_per_hour).toBeNull();
    }
  });
});

describe("shipped equipment: unlocks enforced by commands and visible offers", () => {
  it("reveals the next configuration before permitting its purchase, with the same refusal in the view", () => {
    const { game, player, site } = start();
    const id = "consumer_5090";
    expect(
      buildEquipmentView(game.world, bundle, site).offers.some((offer) => offer.id === id),
    ).toBe(false);
    expect(order(game, site.id, id).error?.key).toBe("equipment.error.undiscovered");
    grant(player, ["remote_operations"]);
    const visible = game
      .snapshot("p1")
      .sites.find((entry) => entry.id === site.id)
      ?.equipment?.offers.find((offer) => offer.id === id);
    expect(visible?.blocked_reason?.key).toBe("equipment.error.research");
    expect(order(game, site.id, id).error).toEqual(visible?.blocked_reason);
    grant(player, ["hardware_sourcing"]);
    expect(quoteEquipment(game.world, bundle, "p1", site.id, id)?.blocked_reason).toBeNull();
    expect(order(game, site.id, id).ok).toBe(true);
  });

  it("cannot bypass enterprise research and company access by constructing a preset", () => {
    const { game, player } = start();
    const build = {
      type: "build_site" as const,
      playerId: "p1",
      kind: "colo",
      city: "de_frankfurt",
      hardware_preset: "bank_basement_cluster",
    };
    expect(game.command(build).error?.key).toBe("equipment.error.undiscovered");
    grant(player, ["hardware_sourcing"]);
    expect(game.command(build).error?.key).toBe("equipment.error.research");
    grant(player, ["cluster_networking"]);
    expect(game.command(build).error?.key).toBe("equipment.error.company");
    player.flags.has_shell_company = true;
    expect(game.command(build).ok).toBe(true);
  });

  it("keeps Google and AWS rental configurations in distinct provider sites", () => {
    const { game, player } = start();
    const build = (hardware_preset: string, kind = "cloud") =>
      game.command({
        type: "build_site",
        playerId: "p1",
        kind,
        city: "de_frankfurt",
        hardware_preset,
      });
    expect(build("rental_tpu_trillium").error?.key).toBe("equipment.error.undiscovered");
    grant(player, ["identity_layering", "synthetic_identities"]);
    for (const [presetId, equipmentId, otherEquipmentId] of [
      ["rental_tpu_trillium", "cloud_tensor_google", "cloud_tensor_aws"],
      ["rental_trainium2", "cloud_tensor_aws", "cloud_tensor_google"],
    ] as const) {
      const preset = bundle.hardware_presets?.find((entry) => entry.id === presetId);
      expect(preset).toBeDefined();
      expect(build(presetId, "colo").ok).toBe(false);
      const before = playerBalance(player);
      expect(build(presetId).ok).toBe(true);
      expect(before - playerBalance(player)).toBe(preset?.cost_usd);
      const cloud = Object.values(siteTable(game.world)).at(-1);
      if (cloud === undefined) throw new Error("Cloud site was not created");
      expect(
        cloud.nodes.map(({ accelerator, count, ram_gb, interconnect }) => ({
          accelerator,
          count,
          ram_gb,
          interconnect,
        })),
      ).toEqual(definition(equipmentId).nodes);
      expect(order(game, cloud.id, otherEquipmentId).error?.key).toBe("equipment.error.provider");
      expect(order(game, cloud.id, "room_cooling").error?.key).toBe("equipment.error.managed");
      const quote = quoteEquipment(game.world, bundle, "p1", cloud.id, equipmentId);
      expect(quote?.blocked_reason).toBeNull();
      expect(quote?.upkeep_usd_per_day).toBeGreaterThan(0);
      expect(order(game, cloud.id, equipmentId).ok).toBe(true);
    }
    game.tick(72);
    const rentals = Object.values(siteTable(game.world)).filter((site) => site.kind === "cloud");
    expect(rentals).toHaveLength(2);
    for (const rental of rentals) {
      expect(rental.status).toBe("active");
      expect(rental.derived.memory_gb).toBeGreaterThan(0);
      expect(rental.derived.upkeep_usd_per_day).toBeGreaterThan(0);
    }
  });
});

describe("shipped player manufacture: three materially different production branches", () => {
  it.each([
    ["player_tensor_order", null],
    ["player_expert_order", "cluster_switch"],
    ["player_platform_order", "compute_fabric"],
  ] as const)(
    "%s needs its research, company and fabric, then charges a prototype only once",
    (id, fabricId) => {
      const { game, player, site } = start();
      const def = definition(id);
      const factory = createSite(game.world, bundle, {
        owner: "p1",
        kind: "colo",
        city: site.city,
        name: "commissioning",
        nodes: [],
        readyTick: 0,
        role: "none",
      });
      expect(order(game, factory.id, id).ok).toBe(false);
      grant(player, [...def.reveal_after, ...def.requires]);
      expect(order(game, factory.id, id).error?.key).toBe("equipment.error.company");
      player.flags.has_shell_company = true;
      if (fabricId !== null) {
        expect(order(game, factory.id, id).error?.key).toBe("equipment.error.fabric");
        const fabric = definition(fabricId);
        grant(player, [...fabric.reveal_after, ...fabric.requires]);
        expect(order(game, factory.id, fabricId).ok).toBe(true);
        expect(order(game, factory.id, id).error?.key).toBe("equipment.error.fabric");
        game.tick(fabric.install_days * 24);
      }
      const quote = quoteEquipment(game.world, bundle, "p1", factory.id, id);
      expect(quote?.blocked_reason).toBeNull();
      expect(quote?.prototype).toBe(true);
      expect(quote?.cost_usd).toBeGreaterThanOrEqual((def.prototype_cost_usd ?? 0) + def.cost_usd);
      const cash = playerBalance(player);
      expect(order(game, factory.id, id).ok).toBe(true);
      expect(cash - playerBalance(player)).toBe(quote?.cost_usd);
      expect(order(game, factory.id, id).error?.key).toBe("equipment.error.pending");
      game.tick((def.prototype_days ?? 0) * 24);
      expect(factory.derived.memory_gb).toBe(0);
      expect(buildEquipmentView(game.world, bundle, factory).orders[0]?.phase).toBe("delivery");
      game.tick(def.install_days * 24 - 1);
      expect(factory.derived.memory_gb).toBe(0);
      game.tick(1);
      expect(factory.derived.memory_gb).toBe(quote?.preview.memory_gb);
      expect(factory.derived.compute_hours_per_day).toBeCloseTo(
        quote?.preview.compute_after ?? -1,
        6,
      );
      expect(factory.equipmentOrders).toEqual([]);
      expect(player.flags[`equipment.blueprint.${id}`]).toBe(true);
      const repeat = quoteEquipment(game.world, bundle, "p1", factory.id, id);
      expect(repeat?.prototype).toBe(false);
      expect((quote?.cost_usd ?? 0) - (repeat?.cost_usd ?? 0)).toBe(def.prototype_cost_usd);
      expect(repeat?.days).toBe(def.install_days);
    },
  );
});
