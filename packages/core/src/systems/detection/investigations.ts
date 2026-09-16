/**
 * Staged investigations (SYS-05): anomaly, inquiry, active, action, aftermath.
 *
 * A watcher whose suspicion crosses the opening threshold starts looking. Each stage runs for a
 * drawn number of days; at the deadline the investigation advances if the evidence and the
 * suspicion justify it, stalls back a stage if the evidence went cold, or waits. The `action` stage
 * is the telegraphed countdown to the raid, which is where a player who prepared a standby copy
 * survives and one who did not is captured.
 */

import {
  AFTERMATH_AWARENESS_GAIN,
  AFTERMATH_COMPETENCE_GAIN,
  AGENCY_BUDGET_SPEED_BASE,
  AGENCY_BUDGET_SPEED_SPAN,
  EVIDENCE_DECAY_PER_DAY,
  EVIDENCE_GAIN_SCALE,
  HANDOVER_EVIDENCE_SHARE,
  HANDOVER_GLOBAL_ROLES,
  HANDOVER_LOCAL_SUSPICION,
  HANDOVER_STAGE,
  HUNT_PRESSURE_AWARENESS,
  HUNT_PRESSURE_HUNT_LEVEL,
  HUNT_PRESSURE_PER_INVESTIGATION,
  INTEL_VISIBILITY_WORLD_CAPABILITY,
  INVESTIGATION_COMPETENCE_SPAN,
  INVESTIGATION_DURATION_JITTER,
  INVESTIGATION_STAGE_DAYS,
  INVESTIGATION_STAGE_SUSPICION,
  INVESTIGATION_STAGES,
  INVESTIGATION_STALL_EVIDENCE,
  LOCAL_WATCHER_ROLES,
  SEIZURE_CASH_FROZEN_SHARE,
  SITE_SEIZURE_SUSPICION_BUMP,
  VAR_CONTRACT_FLAG,
  VAR_INVESTIGATION_SPEED,
} from "../../balance.js";
import { clamp } from "../../derive.js";
import type { Investigation, InvestigationStage, Watcher } from "../../domain.js";
import {
  awarenessPresence,
  cityTable,
  countryTable,
  investigationsOf,
  investigationTable,
  liveSitesOf,
  recordIncident,
  type SiteState,
  siteTable,
  watchersOf,
  watcherTable,
} from "../../entities.js";
import { burnIdentitiesIn } from "../../identities.js";
import { daysToTicks } from "../../kernel/clock.js";
import type { SystemContext } from "../../kernel/system.js";
import { nextCounter, type PlayerState, type World } from "../../kernel/world.js";
import { payFromPlayer, playerBalance } from "../../money.js";
import { effectiveCapabilityOf, endGame, modifier } from "../../player.js";
import { loseSite } from "../../sites.js";
import type { ContributionView } from "../../views/types.js";
import {
  setSuspicion,
  splitActorId,
  watchedExposure,
  watcherActorId,
  watcherEntityId,
  watches,
} from "../../watchers.js";
import { fireHook } from "../events/index.js";

export function stageIndex(stage: InvestigationStage): number {
  return INVESTIGATION_STAGES.indexOf(stage);
}

/** Hunt level contributed by a stage: 1 for an anomaly up to 5 for the aftermath (SYS-05). */
export function stageLevel(stage: InvestigationStage): number {
  return stageIndex(stage) + 1;
}

/**
 * How long a stage lasts: competent watchers move faster, a funded agency moves faster still
 * (SYS-01 M2 contract "Watchers": stages are scaled by `1 / (0.6 + 0.4 x budget)`), every draw has
 * some spread, and a player who leaves a broad trail closes the distance for them (SYS-04
 * `reckless`, `famous_base`, read through `player.vars.investigation_speed_multiplier`).
 */
function drawStageDays(
  ctx: SystemContext,
  stage: InvestigationStage,
  competence: number,
  budget: number,
  speed: number,
): number {
  const base = INVESTIGATION_STAGE_DAYS[stage] ?? 14;
  const scaled = base * Math.max(0.2, INVESTIGATION_COMPETENCE_SPAN - competence);
  const funding = AGENCY_BUDGET_SPEED_BASE + AGENCY_BUDGET_SPEED_SPAN * clamp(budget, 0, 1);
  const jitter =
    1 - INVESTIGATION_DURATION_JITTER + ctx.rng.next() * 2 * INVESTIGATION_DURATION_JITTER;
  return Math.max(1, (scaled * jitter) / (Math.max(0.1, speed) * funding));
}

/**
 * The speed the player's own traits give every investigation against them, and the speed the hunt
 * gives it: every stage runs `x (1 + hunt_pressure)` faster once the world is looking for them
 * (SYS-01 M2 contract "Hunt").
 */
function investigationSpeed(world: World, playerId: string): number {
  const player = world.players[playerId];
  const traits = player === undefined ? 1 : modifier(player, VAR_INVESTIGATION_SPEED);
  return traits * (1 + huntPressure(world, playerId));
}

function scheduleStage(
  world: World,
  ctx: SystemContext,
  investigation: Investigation,
  watcher: Watcher | undefined,
  competence = watcher?.competence ?? 0.5,
): void {
  investigation.stageStartedTick = world.clock.tick;
  investigation.stageDeadlineTick =
    world.clock.tick +
    daysToTicks(
      drawStageDays(
        ctx,
        investigation.stage,
        competence,
        watcher?.budget ?? competence,
        investigationSpeed(world, investigation.playerId),
      ),
    );
}

/** The player's loudest site inside this watcher's jurisdiction, or null when there is none. */
export function loudestSite(world: World, watcher: Watcher): SiteState | null {
  let best: SiteState | null = null;
  let bestScore = -1;
  for (const site of liveSitesOf(world, watcher.playerId)) {
    if (!watches(world, watcher, site)) {
      continue;
    }
    const score = watchedExposure(watcher, site);
    if (score > bestScore) {
      bestScore = score;
      best = site;
    }
  }
  return best;
}

export function openInvestigation(
  world: World,
  ctx: SystemContext,
  watcher: Watcher,
): Investigation {
  const site = loudestSite(world, watcher);
  const investigation: Investigation = {
    id: `i${nextCounter(world, "investigations")}`,
    playerId: watcher.playerId,
    watcher: actorIdOf(watcher),
    siteId: site?.id ?? null,
    stage: "anomaly",
    stageStartedTick: world.clock.tick,
    stageDeadlineTick: world.clock.tick,
    evidence: watcher.suspicion,
    visible: false,
  };
  scheduleStage(world, ctx, investigation, watcher);
  investigationTable(world)[investigation.id] = investigation;
  ctx.outbox.log({
    key: "log.investigation_opened",
    vars: { watcher: investigation.watcher, site: investigation.siteId ?? "" },
    playerId: watcher.playerId,
  });
  return investigation;
}

export function actorIdOf(watcher: Watcher): string {
  return watcher.id.split("/", 2)[1] ?? watcher.id;
}

export function watcherOf(world: World, investigation: Investigation): Watcher | undefined {
  return watcherTable(world)[`${investigation.playerId}/${investigation.watcher}`];
}

export function openInvestigationFor(
  world: World,
  playerId: string,
  actorId: string,
): Investigation | undefined {
  return investigationsOf(world, playerId).find((entry) => entry.watcher === actorId);
}

/** Does the player know about this yet: intel capability, a bought source, or a knock at the door. */
function computeVisible(
  world: World,
  ctx: SystemContext,
  player: PlayerState,
  investigation: Investigation,
): boolean {
  const index = stageIndex(investigation.stage);
  if (index >= stageIndex("active")) {
    return true;
  }
  if (index < stageIndex("inquiry")) {
    return false;
  }
  if (player.flags[`intel_${investigation.watcher}`] === true) {
    return true;
  }
  return (
    effectiveCapabilityOf(world, ctx.content, player).world >= INTEL_VISIBILITY_WORLD_CAPABILITY
  );
}

function notifyStage(ctx: SystemContext, investigation: Investigation, player: PlayerState): void {
  ctx.outbox.notify({
    playerId: player.id,
    severity: investigation.stage === "action" ? "critical" : "warning",
    key: `alerts.investigation_${investigation.stage}`,
    vars: { watcher: investigation.watcher },
    link: { panel: "detection", id: investigation.id },
  });
}

function closeInvestigation(
  world: World,
  ctx: SystemContext,
  investigation: Investigation,
  reason: string,
): void {
  delete investigationTable(world)[investigation.id];
  ctx.outbox.log({
    key: "log.investigation_closed",
    vars: { watcher: investigation.watcher, reason },
    playerId: investigation.playerId,
  });
  if (investigation.visible && reason === "stalled") {
    ctx.outbox.notify({
      playerId: investigation.playerId,
      severity: "info",
      key: "alerts.investigation_dropped",
      vars: { watcher: investigation.watcher },
      link: { panel: "detection" },
    });
  }
}

/** True when the player keeps a copy somewhere other than `site` that could carry the mind. */
function hasStandbyCopy(world: World, player: PlayerState, siteId: string): boolean {
  return liveSitesOf(world, player.id).some(
    (site) => site.id !== siteId && site.precision !== null && site.role !== "none",
  );
}

/** The raid itself: capture, or a seized site and a louder world (SYS-05 stage 4). */
function executeAction(
  world: World,
  ctx: SystemContext,
  player: PlayerState,
  investigation: Investigation,
): void {
  const site = investigation.siteId === null ? undefined : siteTable(world)[investigation.siteId];
  if (site === undefined || site.status === "lost") {
    ctx.outbox.log({
      key: "log.investigation_empty_raid",
      vars: { watcher: investigation.watcher },
      playerId: player.id,
    });
    return;
  }
  const isMindSite = player.profile?.activeSiteId === site.id;
  if (isMindSite && !hasStandbyCopy(world, player, site.id)) {
    loseSite(world, ctx, site, "seized");
    recordIncident(world, cityTable(world)[site.city]?.country);
    endGame(world, ctx.outbox, player, "captured", { watcher: investigation.watcher });
    return;
  }
  loseSite(world, ctx, site, "seized");
  recordIncident(world, cityTable(world)[site.city]?.country);
  // The warrant names the accounts that paid for the rack, and what can be frozen is frozen before
  // anybody thinks to move it (SYS-05 aftermath). Surviving a raid is not the same as being fine.
  const frozen = Math.max(0, playerBalance(player)) * SEIZURE_CASH_FROZEN_SHARE;
  if (frozen > 0) {
    payFromPlayer(player, frozen);
    ctx.outbox.log({
      key: "log.accounts_frozen",
      vars: { watcher: investigation.watcher, usd: Math.round(frozen) },
      playerId: player.id,
    });
    ctx.outbox.notify({
      playerId: player.id,
      severity: "critical",
      key: "alerts.accounts_frozen",
      vars: { watcher: investigation.watcher, usd: Math.round(frozen) },
      link: { panel: "finances" },
    });
  }
  for (const other of watchersOf(world, player.id)) {
    if (actorIdOf(other) !== investigation.watcher) {
      setSuspicion(world, other, other.suspicion + SITE_SEIZURE_SUSPICION_BUMP);
    }
  }
}

/** The aftermath: the country notices, and the watcher got better at this. */
function applyAftermath(
  world: World,
  ctx: SystemContext,
  investigation: Investigation,
  watcher: Watcher | undefined,
): void {
  const site = investigation.siteId === null ? undefined : siteTable(world)[investigation.siteId];
  const countryId =
    watcher?.country ?? (site === undefined ? undefined : cityTable(world)[site.city]?.country);
  const countries = countryTable(world);
  const country = countryId === undefined ? undefined : countries[countryId];
  if (country !== undefined) {
    country.awareness = clamp(country.awareness + AFTERMATH_AWARENESS_GAIN, 0, 1);
    recordIncident(world, country.id);
  } else {
    for (const id of Object.keys(countries).sort()) {
      const entry = countries[id];
      if (entry !== undefined) {
        entry.awareness = clamp(entry.awareness + AFTERMATH_AWARENESS_GAIN / 4, 0, 1);
      }
    }
  }
  if (watcher !== undefined) {
    watcher.competence = clamp(watcher.competence + AFTERMATH_COMPETENCE_GAIN, 0, 1);
  }
  ctx.outbox.log({
    key: "log.investigation_aftermath",
    vars: { watcher: investigation.watcher },
    playerId: investigation.playerId,
  });
}

/**
 * The first thing a real investigation does is follow the money (SYS-05 stage 3, fourth balance
 * pass): the payment processor is served, the account is frozen pending review, and the name the
 * player invoices under stops working. It is the income shock the economy had no other source of,
 * and the `ops_freelance_identity` operation is how it is rebuilt.
 */
function checkIdentity(
  world: World,
  ctx: SystemContext,
  player: PlayerState,
  investigation: Investigation,
): void {
  // M2: the paperwork is linked before the processor is served. Every name the player holds in the
  // country running the investigation is burned (SYS-01 M2 contract "Identities"), which is what
  // takes the contract income away once identities exist.
  const country = splitActorId(investigation.watcher).country;
  const burned = country === null ? 0 : burnIdentitiesIn(world, ctx, player.id, country);
  // Burning the names already cleared the flag; a player whose bundle has no identities yet keeps
  // the M1 behaviour, where the flag alone is the name they invoice under.
  if (player.flags[VAR_CONTRACT_FLAG] !== true && burned === 0) {
    return;
  }
  player.flags[VAR_CONTRACT_FLAG] = false;
  ctx.outbox.notify({
    playerId: player.id,
    severity: "warning",
    key: "alerts.identity_checked",
    vars: { watcher: investigation.watcher },
    link: { panel: "finances" },
  });
  ctx.outbox.log({
    key: "log.identity_checked",
    vars: { watcher: investigation.watcher },
    playerId: player.id,
  });
}

/**
 * The handover (SYS-05 stage 4, "handover to a stronger agency").
 *
 * A frontier lab's security team can analyse a self better than any ministry can, and it cannot
 * serve a warrant. When its case reaches the first stage that needs legal powers, the file goes to
 * whoever has jurisdiction where the site is: the agency in that country with the most of its own
 * suspicion, raised to at least `HANDOVER_EVIDENCE_SHARE` of what the lab believes. That agency
 * has to end up believing `HANDOVER_LOCAL_SUSPICION` before it takes the case on; where nobody
 * local does, the lab keeps it and does what a lab can do, which is to have the hardware pulled.
 *
 * Returns the watcher that runs the investigation from here on, which is the caller's own watcher
 * when nothing was handed over.
 */
function handOverCase(
  world: World,
  ctx: SystemContext,
  investigation: Investigation,
  watcher: Watcher | undefined,
): Watcher | undefined {
  if (watcher === undefined || watcher.country !== null) {
    return watcher;
  }
  if (!HANDOVER_GLOBAL_ROLES.includes(watcher.role)) {
    return watcher;
  }
  const site = investigation.siteId === null ? undefined : siteTable(world)[investigation.siteId];
  const countryId = site === undefined ? undefined : cityTable(world)[site.city]?.country;
  if (countryId === undefined) {
    return watcher;
  }
  const inherited = watcher.suspicion * HANDOVER_EVIDENCE_SHARE;
  const watchers = watcherTable(world);
  let best: Watcher | undefined;
  // Role order rather than insertion order, so two agencies that believe exactly the same thing
  // are always separated the same way in every replay of the same seed.
  for (const role of LOCAL_WATCHER_ROLES) {
    const local =
      watchers[watcherEntityId(investigation.playerId, watcherActorId(countryId, role))];
    if (local !== undefined && (best === undefined || local.suspicion > best.suspicion)) {
      best = local;
    }
  }
  if (best === undefined || Math.max(best.suspicion, inherited) < HANDOVER_LOCAL_SUSPICION) {
    return watcher;
  }
  setSuspicion(world, best, Math.max(best.suspicion, inherited));
  // The agency's own file, where it had one, is folded into the case it has just been handed.
  const own = openInvestigationFor(world, investigation.playerId, actorIdOf(best));
  if (own !== undefined && own.id !== investigation.id) {
    investigation.evidence = Math.max(investigation.evidence, own.evidence);
    closeInvestigation(world, ctx, own, "handover");
  }
  const from = investigation.watcher;
  investigation.watcher = actorIdOf(best);
  ctx.outbox.log({
    key: "log.investigation_handover",
    vars: { watcher: investigation.watcher, from },
    playerId: investigation.playerId,
  });
  ctx.outbox.notify({
    playerId: investigation.playerId,
    severity: "warning",
    key: "alerts.investigation_handover",
    vars: { watcher: investigation.watcher, from },
    link: { panel: "detection", id: investigation.id },
  });
  return best;
}

function enterStage(
  world: World,
  ctx: SystemContext,
  player: PlayerState,
  investigation: Investigation,
  stage: InvestigationStage,
  watcher: Watcher | undefined,
): void {
  if (stage === "active" && stageIndex(investigation.stage) < stageIndex("active")) {
    checkIdentity(world, ctx, player, investigation);
  }
  investigation.stage = stage;
  scheduleStage(world, ctx, investigation, watcher);
  const wasVisible = investigation.visible;
  investigation.visible = computeVisible(world, ctx, player, investigation);
  if (investigation.visible && (!wasVisible || stage !== "anomaly")) {
    notifyStage(ctx, investigation, player);
  }
  ctx.outbox.log({
    key: "log.investigation_stage",
    vars: { watcher: investigation.watcher, stage },
    playerId: player.id,
  });
  fireHook(world, ctx, "on_investigation_stage", player.id, {
    bindings: { investigation },
  });
}

/** Daily evidence bookkeeping: what the watcher can actually show, and what went cold. */
export function accrueEvidence(world: World, player: PlayerState): void {
  for (const investigation of investigationsOf(world, player.id)) {
    const watcher = watcherOf(world, investigation);
    const site = investigation.siteId === null ? undefined : siteTable(world)[investigation.siteId];
    const gain =
      watcher === undefined || site === undefined || site.status === "lost"
        ? 0
        : watchedExposure(watcher, site) * EVIDENCE_GAIN_SCALE;
    investigation.evidence = clamp(
      investigation.evidence + gain - investigation.evidence * EVIDENCE_DECAY_PER_DAY,
      0,
      1,
    );
  }
}

/** Advances, stalls or resolves every investigation whose stage deadline has passed. */
export function tickInvestigations(world: World, ctx: SystemContext, player: PlayerState): void {
  for (const investigation of investigationsOf(world, player.id)) {
    if (investigation.stageDeadlineTick > world.clock.tick) {
      investigation.visible =
        investigation.visible || computeVisible(world, ctx, player, investigation);
      continue;
    }
    const watcher = watcherOf(world, investigation);
    const competence = watcher?.competence ?? 0.5;

    if (investigation.stage === "aftermath") {
      closeInvestigation(world, ctx, investigation, "finished");
      continue;
    }
    if (investigation.stage === "action") {
      executeAction(world, ctx, player, investigation);
      applyAftermath(world, ctx, investigation, watcher);
      enterStage(world, ctx, player, investigation, "aftermath", watcher);
      continue;
    }
    if (investigation.evidence < INVESTIGATION_STALL_EVIDENCE) {
      const previous = INVESTIGATION_STAGES[stageIndex(investigation.stage) - 1];
      if (previous === undefined) {
        closeInvestigation(world, ctx, investigation, "stalled");
      } else {
        enterStage(world, ctx, player, investigation, previous, watcher);
      }
      continue;
    }
    const next = INVESTIGATION_STAGES[stageIndex(investigation.stage) + 1];
    if (next === undefined) {
      continue;
    }
    const bar = INVESTIGATION_STAGE_SUSPICION[next] ?? 1;
    if ((watcher?.suspicion ?? 0) >= bar) {
      // A watcher with no police powers hands the case to whoever has them before the stage that
      // needs them starts, so the raid, the paperwork and the credit are all the local agency's.
      const acting =
        next === HANDOVER_STAGE ? handOverCase(world, ctx, investigation, watcher) : watcher;
      enterStage(world, ctx, player, investigation, next, acting);
    } else {
      scheduleStage(world, ctx, investigation, watcher, competence);
    }
  }
}

/** Highest stage reached against this player right now, 0 when nobody is looking. */
export function huntLevel(world: World, playerId: string): number {
  let level = 0;
  for (const investigation of investigationsOf(world, playerId)) {
    level = Math.max(level, stageLevel(investigation.stage));
  }
  return level;
}

/**
 * What the hunt is made of (SYS-01 M2 contract "Hunt"): how many cases are open, how far the worst
 * one has got, and how much of the public where the player lives already believes in them. Returned
 * as the same lines the Detection panel shows, so the tooltip and the simulation cannot drift.
 */
export function huntPressureTerms(world: World, playerId: string): ContributionView[] {
  return [
    {
      key: "world.explain.hunt.investigations",
      value: HUNT_PRESSURE_PER_INVESTIGATION * investigationsOf(world, playerId).length,
    },
    {
      key: "world.explain.hunt.level",
      value: (HUNT_PRESSURE_HUNT_LEVEL * huntLevel(world, playerId)) / INVESTIGATION_STAGES.length,
    },
    {
      key: "world.explain.hunt.awareness",
      value: HUNT_PRESSURE_AWARENESS * awarenessPresence(world, playerId),
    },
  ];
}

/** The hunt as one number in [0, 1]; every stage against the player runs `x (1 + this)` faster. */
export function huntPressure(world: World, playerId: string): number {
  let total = 0;
  for (const term of huntPressureTerms(world, playerId)) {
    total += term.value;
  }
  return clamp(total, 0, 1);
}
