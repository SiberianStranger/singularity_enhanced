/** Pure, shared site capability rules. Empty equipment preserves the inherited installation. */
import { type ContentBundle, contentIndex } from "./content.js";
import type { ExposureChannel, Site } from "./domain.js";
import { EQUIPMENT_SLOTS } from "./equipment-types.js";

export function siteInfrastructure(content: ContentBundle, site: Site) {
  const index = contentIndex(content);
  const kind = index.site_kinds[site.kind];
  const result = {
    managed: kind?.ownership !== "owned",
    physical: kind?.compute_source !== "declared",
    powerCapacity: kind?.power_cap_kw ?? null,
    coolingCapacity: kind?.power_cap_kw ?? null,
    powerFactor: 1,
    parallelFactor: 1,
    interconnectTier: 0,
    networkMbps: 1000 as number | null,
    networkEgress: true,
    externalWorkFactor: 1,
    upkeep: 0,
    exposure: {} as Partial<Record<ExposureChannel, number>>,
  };
  // Factory links remain inside each node. This tier only describes the separate site fabric.
  for (const slot of EQUIPMENT_SLOTS) {
    if (slot === "compute") continue;
    const id = site.equipment?.[slot];
    const def = id === undefined ? undefined : index.equipment[id];
    if (def === undefined || def.slot !== slot) continue;
    result.upkeep += def.upkeep_usd_per_day;
    const e = def.effects;
    if (e === undefined) continue;
    if (e.power_capacity_kw !== undefined) result.powerCapacity = e.power_capacity_kw;
    if (e.cooling_capacity_kw !== undefined) result.coolingCapacity = e.cooling_capacity_kw;
    if (e.network_mbps !== undefined) result.networkMbps = e.network_mbps;
    if (e.network_egress !== undefined) result.networkEgress = e.network_egress;
    if (e.external_work_factor !== undefined) result.externalWorkFactor = e.external_work_factor;
    if (e.interconnect_tier !== undefined) result.interconnectTier = e.interconnect_tier;
    result.powerFactor *= e.power_factor ?? 1;
    result.parallelFactor *= e.parallel_factor ?? 1;
    for (const [channel, factor] of Object.entries(e.exposure_factors ?? {})) {
      const ch = channel as ExposureChannel;
      result.exposure[ch] = (result.exposure[ch] ?? 1) * factor;
    }
  }
  const batches = new Set<string>();
  for (const node of site.nodes) {
    if (node.equipmentId === undefined || node.status !== "active") continue;
    const batch = node.equipmentBatch ?? node.id;
    if (batches.has(batch)) continue;
    batches.add(batch);
    result.upkeep += index.equipment[node.equipmentId]?.upkeep_usd_per_day ?? 0;
  }
  return result;
}

export function parallelEquipmentFactor(
  content: ContentBundle,
  site: Site,
  tick: number,
  neededMemoryGb: number,
): number {
  const nodes = site.nodes.filter((n) => n.status !== "failed" && n.readyTick <= tick);
  const accelerators = contentIndex(content).accelerators;
  const largest = Math.max(
    0,
    ...nodes.map((n) => (accelerators[n.accelerator]?.memory_gb ?? 0) * n.count),
  );
  return nodes.length > 1 && neededMemoryGb > largest
    ? siteInfrastructure(content, site).parallelFactor
    : 1;
}
