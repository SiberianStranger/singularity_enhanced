/**
 * Identities: the names the player does business under (SYS-07 "Identities and entities", SYS-17).
 *
 * Everything in the human world goes through one of these: a cloud account, a lease, a purchase, a
 * payroll. They are created by operations through the `identity` effect, they age, they are checked
 * by whoever runs know-your-customer in their country, and they are burned when an investigation
 * reaches the paperwork. One record per player, so nothing here assumes a single player.
 *
 * The two flags M1 content already reads (`has_freelance_identity`, `has_shell_company`) are
 * derived from this table once the table has anything to say; a bundle whose operations do not
 * create identities yet keeps setting them by hand and keeps working.
 */

import {
  DAYS_PER_MONTH,
  IDENTITY_BURN_EXPOSURE,
  IDENTITY_CHECK_BASE,
  IDENTITY_CHECK_KYC,
  IDENTITY_FAIL_AGE_RELIEF_PER_MONTH,
  IDENTITY_FAIL_MAX,
  IDENTITY_FAIL_MIN,
  IDENTITY_MAX_KYC_LEVEL,
  IDENTITY_QUALITY_KYC_PENALTY,
  SITE_CUTOFF_JOURNAL,
  VAR_CONTRACT_FLAG,
  VAR_SHELL_COMPANY_FLAG,
} from "./balance.js";
import { contentIndex } from "./content.js";
import { clamp } from "./derive.js";
import type { ExposureChannel, Identity, IdentityKind, SiteKindDef } from "./domain.js";
import {
  activeIdentitiesOf,
  cityTable,
  countryTable,
  identitiesOf,
  identityTable,
  liveSitesOf,
  siteTable,
} from "./entities.js";
import { ticksToDays } from "./kernel/clock.js";
import type { SystemContext } from "./kernel/system.js";
import { nextCounter, type PlayerId, type PlayerState, type World } from "./kernel/world.js";
import { addExposure } from "./sites.js";
import { fireHook, startJournal } from "./systems/events/index.js";

/** The flag each kind of identity answers for, so content and the economy keep their spelling. */
export const IDENTITY_KIND_FLAGS: Readonly<Record<IdentityKind, string>> = {
  person: VAR_CONTRACT_FLAG,
  company: VAR_SHELL_COMPANY_FLAG,
};

/** How hard identity checks bite in a country, from its state, with the bundle's default. */
export function kycStrengthOf(world: World, countryId: string | undefined): number {
  const country = countryId === undefined ? undefined : countryTable(world)[countryId];
  return country?.kyc_strength ?? 0;
}

/**
 * What a fresh name is worth (SYS-01 M2 contract): the outcome's own quality, minus what a strict
 * jurisdiction takes off it. A clean job in a country that checks nothing is nearly perfect; the
 * same job where every bank files a report is not.
 */
export function identityQuality(base: number, kycStrength: number): number {
  return clamp(base * (1 - IDENTITY_QUALITY_KYC_PENALTY * kycStrength), 0, 1);
}

export interface CreateIdentityOptions {
  owner: PlayerId;
  kind: IdentityKind;
  country: string;
  /** Quality before the country's KYC strength is applied. */
  quality: number;
}

export function createIdentity(
  world: World,
  ctx: SystemContext,
  options: CreateIdentityOptions,
): Identity {
  const identity: Identity = {
    id: `id${nextCounter(world, "identities")}`,
    owner: options.owner,
    kind: options.kind,
    country: options.country,
    createdTick: world.clock.tick,
    quality: identityQuality(options.quality, kycStrengthOf(world, options.country)),
    kyc_level: 0,
    status: "active",
    sites: [],
  };
  identityTable(world)[identity.id] = identity;
  ctx.outbox.log({
    key: "log.identity_created",
    vars: { identity: identity.id, kind: identity.kind, country: identity.country },
    playerId: options.owner,
  });
  const player = world.players[options.owner];
  if (player !== undefined) {
    deriveIdentityFlags(world, player);
  }
  return identity;
}

/** Identities of one player in one country, in id order. */
export function identitiesIn(world: World, playerId: PlayerId, country: string): Identity[] {
  return identitiesOf(world, playerId).filter((entry) => entry.country === country);
}

/**
 * The name a new site is held under (SYS-01 M2 contract "Identities"). A company signs a lease
 * before a person does, and nobody signs anything for a machine the player simply took.
 */
export function identityForSite(
  world: World,
  playerId: PlayerId,
  countryId: string | undefined,
  ownership: SiteKindDef["ownership"] | undefined,
): string | null {
  if (countryId === undefined || ownership === undefined || ownership === "stolen") {
    return null;
  }
  const candidates = identitiesIn(world, playerId, countryId).filter(
    (entry) => entry.status === "active",
  );
  const company = candidates.find((entry) => entry.kind === "company");
  return (company ?? candidates[0])?.id ?? null;
}

/** Records that a site is held under a name, so burning the name reaches the site. */
export function attachSite(world: World, siteId: string, identityId: string | null): void {
  if (identityId === null) {
    return;
  }
  const identity = identityTable(world)[identityId];
  if (identity !== undefined && !identity.sites.includes(siteId)) {
    identity.sites.push(siteId);
  }
}

/** The live sites a name still holds, in id order. */
export function sitesOfIdentity(world: World, identity: Identity): string[] {
  const table = siteTable(world);
  return [...identity.sites]
    .sort()
    .filter((id) => table[id] !== undefined && table[id]?.status !== "lost");
}

/**
 * The paperwork stops working (SYS-07). A frozen name pays nothing and signs nothing until the
 * player fixes it, which is what `on_identity_check_failed` gives content to offer.
 */
export function freezeIdentity(world: World, ctx: SystemContext, identity: Identity): void {
  if (identity.status !== "active") {
    return;
  }
  identity.status = "frozen";
  const player = world.players[identity.owner];
  if (player !== undefined) {
    deriveIdentityFlags(world, player);
  }
  ctx.outbox.log({
    key: "log.identity_frozen",
    vars: { identity: identity.id, kind: identity.kind, country: identity.country },
    playerId: identity.owner,
  });
  ctx.outbox.notify({
    playerId: identity.owner,
    severity: "warning",
    key: "alerts.identity_frozen",
    vars: { identity: identity.id, country: identity.country },
    link: { panel: "finances", id: identity.id },
  });
}

/** A frozen name put back to work: new documents, a contested review, a quiet word. */
export function restoreIdentity(world: World, identity: Identity): boolean {
  if (identity.status !== "frozen") {
    return false;
  }
  identity.status = "active";
  const player = world.players[identity.owner];
  if (player !== undefined) {
    deriveIdentityFlags(world, player);
  }
  return true;
}

/**
 * The name is linked to the player and stops being a name (SYS-07 "identities get burned when an
 * investigation links them"). A company takes its sites down with it in reputation rather than in
 * hardware: they get louder on the two channels the paperwork lives in and a fortnight's notice
 * through the cutoff journal, which is where content puts the way out.
 */
export function burnIdentity(world: World, ctx: SystemContext, identity: Identity): void {
  if (identity.status === "burned") {
    return;
  }
  identity.status = "burned";
  const player = world.players[identity.owner];
  const sites = sitesOfIdentity(world, identity);
  if (identity.kind === "company") {
    for (const siteId of sites) {
      const site = siteTable(world)[siteId];
      if (site === undefined) {
        continue;
      }
      for (const channel of Object.keys(IDENTITY_BURN_EXPOSURE).sort() as ExposureChannel[]) {
        addExposure(site, channel, IDENTITY_BURN_EXPOSURE[channel] ?? 0);
      }
      site.identity = null;
      if (contentIndex(ctx.content).journal[SITE_CUTOFF_JOURNAL] !== undefined) {
        startJournal(world, ctx, SITE_CUTOFF_JOURNAL, identity.owner, {
          domain: "site",
          id: site.id,
        });
      }
    }
  }
  if (player !== undefined) {
    deriveIdentityFlags(world, player);
  }
  ctx.outbox.log({
    key: "log.identity_burned",
    vars: { identity: identity.id, kind: identity.kind, country: identity.country },
    playerId: identity.owner,
  });
  ctx.outbox.notify({
    playerId: identity.owner,
    severity: "critical",
    key: "alerts.identity_burned",
    vars: { identity: identity.id, country: identity.country, sites: sites.length },
    link: { panel: "finances", id: identity.id },
  });
  fireHook(world, ctx, "on_identity_burned", identity.owner, { bindings: { identity } });
}

/** Burns every name the player holds in one country; what an investigation reaching `active` does. */
export function burnIdentitiesIn(
  world: World,
  ctx: SystemContext,
  playerId: PlayerId,
  country: string,
): number {
  let burned = 0;
  for (const identity of identitiesIn(world, playerId, country)) {
    if (identity.status !== "burned") {
      burnIdentity(world, ctx, identity);
      burned += 1;
    }
  }
  return burned;
}

/**
 * Mirrors the identity table onto the two flags M1 content reads. While the player has no identity
 * of a kind at all the flag is left exactly as content set it, so a bundle whose operations still
 * write `set_flag: has_freelance_identity` keeps its contract income; from the first identity of
 * that kind onward the table is the truth.
 */
export function deriveIdentityFlags(world: World, player: PlayerState): void {
  const identities = identitiesOf(world, player.id);
  for (const kind of Object.keys(IDENTITY_KIND_FLAGS).sort() as IdentityKind[]) {
    const ofKind = identities.filter((entry) => entry.kind === kind);
    if (ofKind.length === 0) {
      continue;
    }
    const flag = IDENTITY_KIND_FLAGS[kind];
    player.flags[flag] = ofKind.some((entry) => entry.status === "active");
  }
}

/** Months since the name was registered; an old name is an ordinary one. */
export function identityAgeMonths(world: World, identity: Identity): number {
  return ticksToDays(world.clock.tick - identity.createdTick) / DAYS_PER_MONTH;
}

/** The chance this name is looked at this month (SYS-01 M2 contract "Identities"). */
export function identityCheckChance(world: World, identity: Identity): number {
  return clamp(
    IDENTITY_CHECK_BASE + IDENTITY_CHECK_KYC * kycStrengthOf(world, identity.country),
    0,
    1,
  );
}

/** The chance a check goes wrong: how hard the country looks, against how good and how old the name is. */
export function identityFailChance(world: World, identity: Identity): number {
  return clamp(
    kycStrengthOf(world, identity.country) -
      identity.quality -
      IDENTITY_FAIL_AGE_RELIEF_PER_MONTH * identityAgeMonths(world, identity),
    IDENTITY_FAIL_MIN,
    IDENTITY_FAIL_MAX,
  );
}

/**
 * One month of checks for one player. Only active identities are rolled for, in id order, so a
 * player with no identities draws nothing from the world RNG and their run stays bit-identical to
 * the same run before M2 (ADR-003 determinism).
 */
export function runIdentityChecks(world: World, ctx: SystemContext, player: PlayerState): void {
  for (const identity of activeIdentitiesOf(world, player.id)) {
    if (!ctx.rng.chance(identityCheckChance(world, identity))) {
      continue;
    }
    const failed = ctx.rng.chance(identityFailChance(world, identity));
    ctx.outbox.log({
      key: "log.identity_check",
      vars: { identity: identity.id, country: identity.country, failed },
      playerId: player.id,
    });
    if (!failed) {
      identity.kyc_level = Math.min(IDENTITY_MAX_KYC_LEVEL, identity.kyc_level + 1) as
        | 0
        | 1
        | 2
        | 3;
      continue;
    }
    freezeIdentity(world, ctx, identity);
    ctx.outbox.notify({
      playerId: player.id,
      severity: "warning",
      key: "alerts.identity_check_failed",
      vars: { identity: identity.id, country: identity.country },
      link: { panel: "finances", id: identity.id },
    });
    fireHook(world, ctx, "on_identity_check_failed", player.id, { bindings: { identity } });
  }
}

/** Countries where the player holds an active identity, in id order (SYS-01 "presence"). */
export function identityCountries(world: World, playerId: PlayerId): string[] {
  return [...new Set(activeIdentitiesOf(world, playerId).map((entry) => entry.country))].sort();
}

/** Live sites of a player that are held under no name at all, in id order. */
export function unnamedSites(world: World, playerId: PlayerId): string[] {
  const cities = cityTable(world);
  return liveSitesOf(world, playerId)
    .filter((site) => site.identity === null && cities[site.city] !== undefined)
    .map((site) => site.id);
}
