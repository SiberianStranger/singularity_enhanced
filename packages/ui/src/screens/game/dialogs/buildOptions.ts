/**
 * What the build dialog is allowed to offer, and why it is not offering the rest.
 *
 * The dialog asks two questions, a place and a rig, and each answer narrows the next (playtest 8,
 * Z11). Narrowing is only honest if it can say what it left out and why, so every filter here
 * returns the whole list with a reason attached rather than a shorter list.
 *
 * Every reason is the locale key `build_site` itself would refuse with (`packages/core`
 * `systems/compute` "buildSite"), in the order the command checks them, so the dialog cannot say
 * one thing and the engine another. Where the engine would allow it, the reason is null and the
 * option is on the list.
 */

import type {
  CityView,
  CommandError,
  HardwarePresetDef,
  PlayerView,
  SiteKindView,
} from "@singularity/core";
import { catalog, hardwareById } from "../../../content/catalog.js";

/** One kind of place in one city, with the refusal that applies to it there. */
export interface KindOption {
  kind: SiteKindView;
  /** The engine's refusal, or null when a place of this kind can be had here. */
  blocked: CommandError | null;
  /** Days before a watcher is entitled to look at a fresh site of this kind (SYS-02). */
  grace_days: number;
}

/** One rig against one kind of place, with the refusal that applies to that pairing. */
export interface RigOption {
  preset: HardwarePresetDef;
  blocked: CommandError | null;
  /** What it costs to stand up here: the price where it is bought, nothing where it is rented. */
  cost_usd: number;
  /** Whether anybody sells this configuration at all (playtest 8, Z10). */
  purchasable: boolean;
  /** Why not, as a locale key, when nobody does. */
  not_for_sale_key: string | null;
}

function error(key: string, vars: Record<string, string | number>): CommandError {
  return { key, vars };
}

/**
 * The kinds of place, for one city, in the order the catalog publishes them.
 *
 * Three things can stop a kind: the city (no colocation market, no cloud seller), the kind itself
 * (arranged through an operation rather than bought), and the kind having nowhere to put hardware
 * at all, which is what a borrowed channel is.
 */
export function kindOptions(view: PlayerView, city: CityView | undefined): KindOption[] {
  const perCity = new Map((city?.site_kinds ?? []).map((entry) => [entry.kind, entry]));
  const grace = new Map(catalog.siteKinds.map((def) => [def.id, def.grace_days]));
  return (view.catalog?.site_kinds ?? []).map((kind) => {
    const here = perCity.get(kind.id);
    const blocked =
      here?.blocked_reason ??
      (kind.max_nodes <= 0
        ? error("errors.site_kind.not_a_place", { kind: kind.id })
        : kind.blocked_reason !== undefined && kind.blocked_reason !== "errors.cash.insufficient"
          ? error(kind.blocked_reason, { kind: kind.id })
          : null);
    return { kind, blocked, grace_days: grace.get(kind.id) ?? 0 };
  });
}

/**
 * The rigs, against one kind of place.
 *
 * The order of the checks is `build_site`'s own: too many nodes for the kind, a kind nobody sells,
 * a rig nobody sells, a rig nobody rents here, and only then the money. The last one is left to
 * the caller, because it is the only reason that changes while the dialog is open.
 */
export function rigOptions(
  view: PlayerView,
  kind: SiteKindView | undefined,
  presets: readonly HardwarePresetDef[] = catalog.hardwarePresets,
): RigOption[] {
  const hourly = new Map(
    (view.catalog?.accelerators ?? []).map((card) => [card.id, card.hourly_usd]),
  );
  return presets.map((preset) => {
    const purchasable = preset.purchasable !== false;
    const notForSale = preset.not_for_sale_reason_key ?? null;
    const cost = kind === undefined || kind.ownership !== "owned" ? 0 : preset.cost_usd;
    const blocked = ((): CommandError | null => {
      if (kind === undefined) {
        return null;
      }
      if (preset.nodes.length > kind.max_nodes) {
        return error("errors.site.node_limit", { kind: kind.id, max: kind.max_nodes });
      }
      if (kind.ownership === "stolen" || kind.ownership === "partner") {
        return error("errors.site_kind.not_for_sale", { kind: kind.id });
      }
      // A rig with no price is access, not ownership: a queue share, a state allocation, a tenancy
      // somebody else pays for. It cannot be bought and stood up in a place of one's own (Z10).
      if (kind.ownership === "owned" && (!purchasable || preset.cost_usd <= 0)) {
        return error(notForSale ?? "errors.preset.is_access", { preset: preset.id });
      }
      if (kind.ownership === "rented") {
        const offered = preset.nodes.every((node) => hourly.get(node.accelerator) !== undefined);
        if (!offered) {
          return error("errors.preset.not_rentable", { preset: preset.id });
        }
      }
      if (kind.power_cap_kw !== null && preset.power_kw > kind.power_cap_kw) {
        return error("errors.site.power_cap", {
          site: kind.id,
          kw: Math.round(preset.power_kw * 10) / 10,
          cap: kind.power_cap_kw,
        });
      }
      return null;
    })();
    return {
      preset,
      blocked,
      cost_usd: cost,
      purchasable,
      not_for_sale_key: notForSale,
    };
  });
}

/** The preset record behind an id, for the callers that hold only the id. */
export function presetById(id: string): HardwarePresetDef | undefined {
  return hardwareById.get(id);
}
