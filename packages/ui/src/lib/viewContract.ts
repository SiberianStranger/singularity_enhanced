/**
 * Small readers over the parts of the view the playtest asked the panels to explain.
 *
 * The core sends the data now (`ResearchView.techs`, `PlayerView.catalog`,
 * `SelfView.precision_options`, `FinancesView.income_sources`, effect lists on options, decisions
 * and offers). What is left for the client is naming things the view refers to by id, turning a
 * refusal into a message, and the two or three derived numbers a dialog shows before it sends a
 * command. Those live here so panels stay about layout.
 *
 * The `?? []` guards are deliberate: the view also arrives from a save, from a worker built before
 * a reload, and (later) from a server, so a missing list renders as an empty table rather than as a
 * crash.
 */

import type {
  AcceleratorView,
  CommandResult,
  EffectSummaryView,
  PlayerView,
  PrecisionOptionView,
  SiteKindView,
  TechView,
  TextVar,
} from "@singularity/core";
import { EXPOSURE_CHANNELS } from "@singularity/core";
import { operationById, techById } from "../content/defs.js";

// ---------------------------------------------------------------------------------------------
// Research
// ---------------------------------------------------------------------------------------------

/** Every tech with its status, which is what the Research tab filters and sorts (U2). */
export function techRows(view: PlayerView): TechView[] {
  const all = view.research.techs;
  if (all !== undefined && all.length > 0) {
    return [...all];
  }
  // A view from before the engine sent the full list: the two lists it always sent still render.
  return [...view.research.in_progress, ...view.research.available];
}

/**
 * The locale key that names a tech or an operation id.
 *
 * `requires` and `unlocks` are ids, and an unlock can be either kind, so the lookup checks the
 * content bundle for which one it is instead of guessing from the shape of the id.
 */
export function entityNameKey(id: string): string {
  if (techById.has(id)) {
    return `techs.${id}.name`;
  }
  const operation = operationById.get(id);
  return operation === undefined ? `techs.${id}.name` : operation.name_key;
}

// ---------------------------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------------------------

export function siteKindRows(view: PlayerView): SiteKindView[] {
  return [...(view.catalog?.site_kinds ?? [])];
}

export function acceleratorRows(view: PlayerView): AcceleratorView[] {
  return [...(view.catalog?.accelerators ?? [])];
}

/** The channels a site kind leaks on, loudest first, for the exposure column of the build table. */
export function exposureChannels(profile: SiteKindView["exposure_profile"]): string[] {
  return EXPOSURE_CHANNELS.filter((channel) => (profile?.[channel] ?? 0) > 0).sort(
    (a, b) => (profile[b] ?? 0) - (profile[a] ?? 0),
  );
}

export function precisionRows(view: PlayerView): PrecisionOptionView[] {
  return [...(view.self.precision_options ?? [])];
}

/** What `count` of an accelerator costs, or null for a card that is rented rather than bought. */
export function totalPriceUsd(card: AcceleratorView, count: number): number | null {
  return card.price_usd > 0 ? card.price_usd * count : null;
}

export interface PurchasePreview {
  total_usd: number | null;
  hourly_usd: number | null;
  memory_after_gb: number;
  power_after_kw: number;
  power_cap_kw: number | null;
  over_power_cap: boolean;
  affordable: boolean;
}

/**
 * What a site looks like after the order lands: the memory and the wall power the player is about
 * to commit to, against the cap and against the cash. The engine decides whether the command is
 * legal; this is what the dialog shows before asking it (U1).
 */
export function purchasePreview(
  view: PlayerView,
  siteId: string,
  card: AcceleratorView | undefined,
  count: number,
): PurchasePreview {
  const site = view.sites.find((entry) => entry.id === siteId);
  const total = card === undefined ? null : totalPriceUsd(card, count);
  const addedMemory = (card?.vram_gb ?? 0) * count;
  // Wall power, not board power: the room is charged for too, which is the number the cap is on.
  const addedKw = ((card?.power_w ?? 0) * count) / 1000;
  const powerAfter = (site?.power_kw ?? 0) + addedKw;
  const cap = site?.power_cap_kw ?? null;
  return {
    total_usd: total,
    hourly_usd: card?.hourly_usd === undefined ? null : card.hourly_usd * count,
    memory_after_gb: (site?.memory_gb ?? 0) + addedMemory,
    power_after_kw: powerAfter,
    power_cap_kw: cap,
    over_power_cap: cap !== null && powerAfter > cap,
    affordable: total === null || total <= view.resources.cash_usd,
  };
}

// ---------------------------------------------------------------------------------------------
// Finances
// ---------------------------------------------------------------------------------------------

export function incomeSourceRows(view: PlayerView): PlayerView["finances"]["income_sources"] {
  return view.finances.income_sources ?? [];
}

export interface MarketDepth {
  ch_per_day: number;
  what_raises_it: string[];
}

/** How much paid work the market will take, and what would make it take more (C6). */
export function marketDepth(view: PlayerView): MarketDepth {
  return {
    ch_per_day: view.finances.market_depth_ch_per_day ?? 0,
    what_raises_it: [...(view.finances.what_raises_it ?? [])],
  };
}

// ---------------------------------------------------------------------------------------------
// Effect lists
// ---------------------------------------------------------------------------------------------

/** An effect list, guarded: an older view has no list and renders as "nothing to say". */
export function effectsOf(source: { effects?: readonly EffectSummaryView[] }): EffectSummaryView[] {
  return [...(source.effects ?? [])];
}

// ---------------------------------------------------------------------------------------------
// Refused commands
// ---------------------------------------------------------------------------------------------

export interface Refusal {
  key: string;
  vars: Record<string, TextVar>;
}

/**
 * The reason a command was refused, as a locale key and its variables.
 *
 * Refusals are data (`CommandError`), so the message is localized on the client. A refusal that
 * somehow arrives as prose (an older worker, a host-level failure) still reaches the player,
 * wrapped in the generic "that was refused" message rather than shown as a bare identifier.
 */
export function refusalOf(result: CommandResult): Refusal | null {
  if (result.ok) {
    return null;
  }
  const error: unknown = result.error;
  if (typeof error === "object" && error !== null) {
    const shaped = error as { key?: unknown; vars?: unknown };
    if (typeof shaped.key === "string") {
      return { key: shaped.key, vars: (shaped.vars ?? {}) as Record<string, TextVar> };
    }
  }
  if (typeof error === "string" && /^[a-z0-9_]+(\.[a-z0-9_]+)+$/i.test(error)) {
    return { key: error, vars: {} };
  }
  return { key: "error.command", vars: { message: typeof error === "string" ? error : "" } };
}
