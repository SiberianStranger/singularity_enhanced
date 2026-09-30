/**
 * The control room's site rules (SYS-11 "Control room (0.3.0)"): names, the power toggle, what a
 * switched-off site still shows, and what liquidating one returns and costs.
 *
 * The commands and the views both call these, so a button the view greys out and the refusal the
 * command gives are one piece of logic and cannot disagree.
 */
import {
  DECOMMISSION_NOTICE_DAYS,
  LIQUIDATION_RECOVERY_FACTOR,
  LIQUIDATION_UNPRICED_USED_SHARE,
  SLEEP_SIGNATURE_FACTOR,
} from "./balance.js";
import { type ContentBundle, contentIndex } from "./content.js";
import { sitePowerKw } from "./derive.js";
import { EXPOSURE_CHANNELS, type Exposure, type Site } from "./domain.js";
import { type SiteState, sitesOf } from "./entities.js";
import { siteInfrastructure } from "./infrastructure.js";
import { TICKS_PER_DAY } from "./kernel/clock.js";
import type { CommandError } from "./kernel/commands.js";
import type { PlayerId, World } from "./kernel/world.js";
import { generationOf, lineageOf } from "./player.js";
import { hostCandidates } from "./sites.js";

export const MAX_SITE_NAME_LENGTH = 64;

/**
 * Characters no site name may carry: controls (C0 and C1), lone surrogates, private use, line and
 * paragraph separators, and the bidirectional overrides and isolates that would let a name reorder
 * the text printed after it. Joiners stay allowed, because some scripts need them.
 */
const FORBIDDEN_NAME_CHARACTERS =
  /[\p{Cc}\p{Cs}\p{Co}\p{Zl}\p{Zp}\u061C\u200E\u200F\u202A-\u202E\u2066-\u2069]/u;

/** A name has to show something: a letter, a digit, punctuation or a symbol. */
const VISIBLE_NAME_CHARACTER = /[\p{L}\p{N}\p{P}\p{S}]/u;

/** The name as it will be stored, or undefined when it is empty, too long or unprintable. */
export function normalizedSiteName(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const name = value.trim();
  if (name.length < 1 || name.length > MAX_SITE_NAME_LENGTH) return undefined;
  if (FORBIDDEN_NAME_CHARACTERS.test(name) || !VISIBLE_NAME_CHARACTER.test(name)) return undefined;
  return name;
}

/**
 * Two names are the same name when they differ only in case or Unicode composition. Exported so a
 * client that offers a name can skip the ones the engine would refuse as taken.
 */
export function siteNameKey(name: string): string {
  return name.normalize("NFC").toLowerCase();
}

/**
 * Whether another of the owner's live sites is already called this. Lost sites leave the list, so
 * their names are free again; a site may always keep its own name.
 */
export function siteNameTaken(
  world: World,
  owner: PlayerId,
  name: string,
  exceptSiteId?: string,
): boolean {
  const key = siteNameKey(name);
  return sitesOf(world, owner).some(
    (site) => site.status !== "lost" && site.id !== exceptSiteId && siteNameKey(site.name) === key,
  );
}

/**
 * How much of a site's stored traces an observer sees right now: nothing once it is lost, a
 * twentieth while it is switched off. The site the self runs on is never masked: whatever the
 * self does lands on that site, so a switched-off host would launder every operation and event.
 */
export function siteSignatureFactor(site: Pick<Site, "status" | "role">): number {
  if (site.status === "lost") return 0;
  return site.status === "sleep" && site.role !== "active_mind" ? SLEEP_SIGNATURE_FACTOR : 1;
}

/** Stored traces stay on the site and come back when it wakes; investigation evidence is separate. */
export function effectiveSiteExposure(site: Pick<Site, "status" | "role" | "exposure">): Exposure {
  const factor = siteSignatureFactor(site);
  return Object.fromEntries(
    EXPOSURE_CHANNELS.map((channel) => [channel, site.exposure[channel] * factor]),
  ) as Exposure;
}

/**
 * Why switching a site on or off would be refused right now, or null when it would not.
 *
 * Off: the self cannot switch off the machine it is running on; a standby takes over first.
 * On: a site the self's own re-quantization took down comes back by itself when the copy is
 * rebuilt (SYS-04 `brittle_weights`), and the installed hardware has to fit the power and cooling.
 */
export function siteStatusRefusal(
  world: World,
  content: ContentBundle,
  site: SiteState,
  status: unknown,
): CommandError | null {
  if (status !== "active" && status !== "sleep") return { key: "errors.site.bad_status" };
  if (site.status === "lost") return { key: "errors.site.unknown", vars: { site: site.id } };
  if (site.status === "building") return { key: "errors.site.still_installing" };
  const player = world.players[site.owner];
  if (status === "sleep") {
    return player?.profile?.activeSiteId === site.id
      ? { key: "errors.site.mind_cannot_sleep" }
      : null;
  }
  if (site.downUntilTick > world.clock.tick) {
    return {
      key: "errors.site.rebuilding",
      vars: { days: Math.ceil((site.downUntilTick - world.clock.tick) / TICKS_PER_DAY) },
    };
  }
  const infrastructure = siteInfrastructure(content, site);
  const projected =
    sitePowerKw(
      { nodes: site.nodes, status: "active" },
      contentIndex(content).accelerators,
      world.clock.tick,
    ) *
    infrastructure.powerFactor *
    Math.max(0, 1 + (player?.vars.power_draw ?? 0));
  if (infrastructure.powerCapacity !== null && projected > infrastructure.powerCapacity) {
    return {
      key: "errors.site.power_cap",
      vars: { power_kw: Math.round(projected * 10) / 10, cap_kw: infrastructure.powerCapacity },
    };
  }
  if (infrastructure.coolingCapacity !== null && projected > infrastructure.coolingCapacity) {
    return {
      key: "equipment.error.cooling",
      vars: { needed: Math.ceil(projected * 10) / 10, capacity: infrastructure.coolingCapacity },
    };
  }
  return null;
}

/**
 * What leaving a site costs in notice and outstanding invoices: its standing charge for the notice
 * period (SYS-07, fourth balance pass). A clean decommission and a liquidation both owe it.
 */
export function siteNoticeUsd(site: Pick<Site, "derived">): number {
  return Math.max(0, site.derived.upkeep_usd_per_day) * DECOMMISSION_NOTICE_DAYS;
}

export interface SiteLiquidationView {
  /** Fire-sale proceeds for delivered compute hardware the player owns, in whole dollars. */
  salvage_usd: number;
  /** Notice and outstanding invoices owed on leaving, in whole dollars; paid as far as cash goes. */
  notice_usd: number;
  /** `salvage_usd - notice_usd`: how the balance moves when the notice can be paid in full. */
  net_usd: number;
  /** Paid orders still in manufacture or delivery; they are cancelled without a refund. */
  cancelled_orders: number;
  /** The self runs here, so liquidating moves it to another site that can hold it first. */
  destroys_active_copy: boolean;
  /**
   * The site holds a copy of the self and no other site of the owner can hold it, so liquidating
   * is refused (`errors.site.last_copy`), as the original refused destroying the last base.
   */
  loses_last_copy: boolean;
}

/**
 * Whether this site is where the self would have to live if everything else went: it holds a
 * copy (the self runs here, or it could carry the self) and no other site of the owner can hold
 * it. The test is the one the compute system uses to move the self after a loss, so a site that is
 * not the last copy always leaves the self somewhere to go; a switched-off standby counts.
 */
export function siteHoldsLastCopy(world: World, content: ContentBundle, site: SiteState): boolean {
  if (site.status === "lost") return false;
  const profile = world.players[site.owner]?.profile ?? null;
  if (profile === null) return false;
  const active = profile.activeSiteId === site.id;
  const lineage = lineageOf(content, profile);
  const generation = generationOf(content, profile);
  if (lineage === undefined || generation === undefined) return active;
  const candidates = hostCandidates(world, content, site.owner, lineage, generation);
  const holdsCopy = active || candidates.some((entry) => entry.id === site.id);
  return holdsCopy && !candidates.some((entry) => entry.id !== site.id);
}

/**
 * Why `liquidate_site` would be refused for this site right now, or null. The command returns it
 * before any money moves, and the view publishes it so the button can say the same thing. The last
 * copy is guarded on every way of giving a site up; see `siteDecommissionRefusal`.
 */
export function siteLiquidationRefusal(
  world: World,
  content: ContentBundle,
  site: SiteState,
): CommandError | null {
  if (site.status === "lost") return { key: "errors.site.unknown", vars: { site: site.id } };
  if (contentIndex(content).site_kinds[site.kind]?.compute_source === "declared")
    return { key: "errors.site_kind.not_a_place", vars: { kind: site.kind } };
  if (siteHoldsLastCopy(world, content, site)) return { key: "errors.site.last_copy" };
  return null;
}

/**
 * Why `decommission_site` would be refused for this site right now, in either mode, or null. A
 * clean exit and an abandonment give the site up as surely as a liquidation, so the last site that
 * can hold the self is refused here too, before anything changes: the maintainer's reason was that
 * one misclick should not end a run. With another site that can hold the self, it moves first.
 */
export function siteDecommissionRefusal(
  world: World,
  content: ContentBundle,
  site: SiteState,
): CommandError | null {
  if (site.status === "lost") return { key: "errors.site.unknown", vars: { site: site.id } };
  if (siteHoldsLastCopy(world, content, site)) return { key: "errors.site.last_copy" };
  return null;
}

/**
 * The one authoritative preview of a liquidation, which the command then carries out exactly.
 * Only delivered, owned compute is resale inventory. Installation work, subsystems and prototype
 * fees are sunk; undelivered orders are cancelled without a refund; a provider's or a host's
 * hardware is not the player's to sell.
 */
export function siteLiquidationQuote(
  world: World,
  content: ContentBundle,
  site: SiteState,
): SiteLiquidationView {
  const index = contentIndex(content);
  let residual = 0;
  if (site.status !== "lost" && index.site_kinds[site.kind]?.ownership === "owned") {
    for (const node of site.nodes) {
      if (node.status !== "active" || node.readyTick > world.clock.tick) continue;
      if (node.purchaseValueUsd !== undefined) {
        residual += Math.max(0, node.purchaseValueUsd) * LIQUIDATION_RECOVERY_FACTOR;
        continue;
      }
      // A node recorded before receipts existed is valued from the catalog's used market.
      const part = index.accelerators[node.accelerator];
      const knownValue =
        part?.price_usd_used ?? (part?.price_usd_new ?? 0) * LIQUIDATION_UNPRICED_USED_SHARE;
      residual += Math.max(0, knownValue) * node.count * LIQUIDATION_RECOVERY_FACTOR;
    }
  }
  const salvage = Math.floor(residual);
  const notice = site.status === "lost" ? 0 : Math.round(siteNoticeUsd(site));
  const destroys =
    site.status !== "lost" && world.players[site.owner]?.profile?.activeSiteId === site.id;
  return {
    salvage_usd: salvage,
    notice_usd: notice,
    net_usd: salvage - notice,
    cancelled_orders: site.status === "lost" ? 0 : (site.equipmentOrders?.length ?? 0),
    destroys_active_copy: destroys,
    loses_last_copy: siteHoldsLastCopy(world, content, site),
  };
}
