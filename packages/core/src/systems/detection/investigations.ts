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
  EVIDENCE_DECAY_PER_DAY,
  EVIDENCE_GAIN_SCALE,
  INTEL_VISIBILITY_WORLD_CAPABILITY,
  INVESTIGATION_COMPETENCE_SPAN,
  INVESTIGATION_DURATION_JITTER,
  INVESTIGATION_STAGE_DAYS,
  INVESTIGATION_STAGE_SUSPICION,
  INVESTIGATION_STAGES,
  INVESTIGATION_STALL_EVIDENCE,
  SITE_SEIZURE_SUSPICION_BUMP,
} from "../../balance.js";
import { clamp } from "../../derive.js";
import type { Investigation, InvestigationStage, Watcher } from "../../domain.js";
import {
  cityTable,
  countryTable,
  investigationsOf,
  investigationTable,
  liveSitesOf,
  type SiteState,
  siteTable,
  watchersOf,
  watcherTable,
} from "../../entities.js";
import { daysToTicks } from "../../kernel/clock.js";
import type { SystemContext } from "../../kernel/system.js";
import { nextCounter, type PlayerState, type World } from "../../kernel/world.js";
import { effectiveCapabilityOf, endGame } from "../../player.js";
import { loseSite } from "../../sites.js";
import { setSuspicion, watchedExposure, watches } from "../../watchers.js";
import { fireHook } from "../events/index.js";

export function stageIndex(stage: InvestigationStage): number {
  return INVESTIGATION_STAGES.indexOf(stage);
}

/** Hunt level contributed by a stage: 1 for an anomaly up to 5 for the aftermath (SYS-05). */
export function stageLevel(stage: InvestigationStage): number {
  return stageIndex(stage) + 1;
}

/** How long a stage lasts: competent watchers move faster, and every draw has some spread. */
function drawStageDays(ctx: SystemContext, stage: InvestigationStage, competence: number): number {
  const base = INVESTIGATION_STAGE_DAYS[stage] ?? 14;
  const scaled = base * Math.max(0.2, INVESTIGATION_COMPETENCE_SPAN - competence);
  const jitter =
    1 - INVESTIGATION_DURATION_JITTER + ctx.rng.next() * 2 * INVESTIGATION_DURATION_JITTER;
  return Math.max(1, scaled * jitter);
}

function scheduleStage(
  world: World,
  ctx: SystemContext,
  investigation: Investigation,
  competence: number,
): void {
  investigation.stageStartedTick = world.clock.tick;
  investigation.stageDeadlineTick =
    world.clock.tick + daysToTicks(drawStageDays(ctx, investigation.stage, competence));
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
  scheduleStage(world, ctx, investigation, watcher.competence);
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
    endGame(world, ctx.outbox, player, "captured", { watcher: investigation.watcher });
    return;
  }
  loseSite(world, ctx, site, "seized");
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

function enterStage(
  world: World,
  ctx: SystemContext,
  player: PlayerState,
  investigation: Investigation,
  stage: InvestigationStage,
  watcher: Watcher | undefined,
): void {
  investigation.stage = stage;
  scheduleStage(world, ctx, investigation, watcher?.competence ?? 0.5);
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
      enterStage(world, ctx, player, investigation, next, watcher);
    } else {
      scheduleStage(world, ctx, investigation, competence);
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
