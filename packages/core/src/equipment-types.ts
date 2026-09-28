/** Player-facing equipment is a complete configuration, grouped into singular archetypes. */
import type { ExposureChannel, NodeSpec } from "./domain.js";
import type { CommandError } from "./kernel/commands.js";

export const EQUIPMENT_SLOTS = [
  "compute",
  "power",
  "cooling",
  "network",
  "interconnect",
  "security",
] as const;
export type EquipmentSlot = (typeof EQUIPMENT_SLOTS)[number];
export interface EquipmentEffects {
  power_capacity_kw?: number;
  cooling_capacity_kw?: number;
  power_factor?: number;
  interconnect_tier?: number;
  parallel_factor?: number;
  network_mbps?: number;
  network_egress?: boolean;
  external_work_factor?: number;
  exposure_factors?: Partial<Record<ExposureChannel, number>>;
}
export interface EquipmentDef {
  id: string;
  acquisition?: "purchase" | "rental";
  slot: EquipmentSlot;
  archetype: string;
  name_key: string;
  desc_key: string;
  tradeoff_key: string;
  variant_key?: string;
  basis: string[];
  stage: number;
  requires: string[];
  reveal_after: string[];
  available_year?: number;
  site_kinds: string[];
  cost_usd: number;
  upkeep_usd_per_day: number;
  install_days: number;
  prototype_days?: number;
  prototype_cost_usd?: number;
  requires_company?: boolean;
  min_interconnect_tier?: number;
  nodes?: NodeSpec[];
  effects?: EquipmentEffects;
}
export interface EquipmentOrder {
  id: string;
  equipment_id: string;
  ordered_tick: number;
  prototype_end_tick: number;
  ready_tick: number;
}
export interface EquipmentPreview {
  memory_before_gb?: number;
  power_before_kw?: number;
  memory_gb: number;
  power_kw: number;
  power_capacity_kw: number | null;
  cooling_capacity_kw: number | null;
  compute_before: number;
  compute_after: number;
  fits_self: boolean;
}
export interface EquipmentOfferView {
  id: string;
  slot: EquipmentSlot;
  archetype: string;
  name_key: string;
  desc_key: string;
  tradeoff_key: string;
  variant_key?: string;
  basis: string[];
  stage: number;
  requires: { id: string; name_key: string; done: boolean }[];
  blocked_reason: CommandError | null;
  cost_usd: number;
  upkeep_usd_per_day: number;
  days: number;
  prototype: boolean;
  preview: EquipmentPreview;
}
export interface SiteEquipmentView {
  slots: {
    id: EquipmentSlot;
    installed_key: string;
    installed_keys?: string[];
    managed: boolean;
  }[];
  offers: EquipmentOfferView[];
  orders: {
    id: string;
    name_key: string;
    slot: EquipmentSlot;
    phase: "prototype" | "delivery";
    remaining_days: number;
  }[];
  power_capacity_kw: number | null;
  cooling_capacity_kw: number | null;
  network_mbps: number | null;
  network_egress: boolean;
  interconnect_tier: number;
}
