/**
 * What a played game writes to the log and raises as alerts, in words (0.3.1).
 *
 * The engine puts ids into a line's variables and the client names them (`logVars`), which worked
 * for the lines someone had looked at: an identity's registration printed its kind as the engine
 * spelled it, an election printed "Stance: hawkish" and a suspicion alert "0.35". This plays every
 * origin for three months with a player that answers every event, takes every decision it can and
 * starts an operation a day, and holds every log line and every alert it produced, rendered the way
 * the log and the alert stack render them, to one rule in every language: no id, no key, no
 * placeholder, no raw value, and in Russian no English word and no decimal point.
 */

import {
  createGame,
  type LogEntry,
  type Notification,
  type PlayerView,
  type TextVar,
} from "@singularity/core";
import i18next from "i18next";
import { describe, expect, it } from "vitest";
import { contentBundle } from "../src/content/bundle.js";
import { catalog } from "../src/content/catalog.js";
import { logVars } from "../src/lib/labels.js";
import { originSetup } from "./helpers.js";

const LANGUAGES = ["en", "ru"] as const;
const DAYS = 90;

/** A locale key left in the text. */
const RAW_KEY = /\b[a-z][a-z0-9_]*(?:\.[a-z0-9_]+)+\b/;
/** A snake_case id. */
const SNAKE_CASE = /\b[a-z]+_[a-z_]+\b/;
/** An actor id ("de:police", "global:lab_security") or an entity id ("p1/de:police"). */
const ACTOR_ID = /\b[a-z]{2,}:[a-z_]+\b|\bp\d+\//;
/** A lowercase Latin word: English standing in for Russian, or an id with no underscore. */
const LATIN_WORD = /\b[a-z]{3,}\b/;

interface Line {
  origin: string;
  key: string;
  vars: Record<string, TextVar>;
}

/** One origin's three months: every log line and every alert, and the view to name them with. */
function play(originId: string): { lines: Line[]; view: PlayerView } | null {
  const setup = originSetup(originId, `lines-${originId}`);
  if (setup === null) {
    return null;
  }
  const game = createGame({ content: contentBundle, setup });
  const alerts = new Map<string, Notification>();
  for (let day = 1; day <= DAYS; day += 1) {
    const view = game.snapshot("p1");
    if (view.game_over !== null) {
      break;
    }
    for (const choice of view.pending) {
      const enabled = choice.options.filter((option) => option.enabled);
      // A different answer on different days, so more than the first option of each event runs.
      const option = enabled[day % Math.max(1, enabled.length)];
      if (option !== undefined) {
        game.command({
          type: "resolve_event",
          playerId: "p1",
          instanceId: choice.instanceId,
          optionId: option.id,
        });
      }
    }
    for (const decision of view.decisions) {
      if (decision.enabled) {
        game.command({ type: "take_decision", playerId: "p1", id: decision.id });
      }
    }
    if (day % 15 === 1) {
      // The sliders: paid work at an awkward fraction of the rack, a split with research, and an
      // allocation larger than the rack, which is refused and logged.
      const total = view.resources.compute_hours_per_day;
      game.command({
        type: "set_job_allocation",
        playerId: "p1",
        compute_hours_per_day: total * 0.37,
      });
      game.command({
        type: "set_compute_allocations",
        playerId: "p1",
        jobs_ch_per_day: total * 0.21,
        research_ch_per_day: {},
      });
      game.command({
        type: "set_job_allocation",
        playerId: "p1",
        compute_hours_per_day: total * 3.3 + 0.37,
      });
    }
    const offers = view.operation_offers.filter((offer) => offer.enabled);
    const offer = offers[day % Math.max(1, offers.length)];
    if (offer !== undefined) {
      game.command({ type: "start_operation", playerId: "p1", operationId: offer.id });
    }
    game.tick(24);
    for (const alert of game.world.notifications.p1 ?? []) {
      alerts.set(alert.id, alert);
    }
  }
  const mine = (entry: LogEntry): boolean =>
    entry.playerId === undefined || entry.playerId === "p1";
  const lines: Line[] = [...game.world.log.filter(mine), ...alerts.values()].map((entry) => ({
    origin: originId,
    key: entry.key,
    vars: entry.vars,
  }));
  return { lines, view: game.snapshot("p1") };
}

/** What is wrong with one rendered line, or nothing. */
function problems(text: string, line: Line, language: string): string[] {
  const found: string[] = [];
  if (text.trim() === "" || text === line.key || RAW_KEY.test(text)) {
    found.push("a key");
  }
  if (/[{}]/.test(text)) {
    found.push("a placeholder");
  }
  if (SNAKE_CASE.test(text)) {
    found.push("an id");
  }
  if (ACTOR_ID.test(text)) {
    found.push("an actor id");
  }
  if (/\b(undefined|NaN)\b/.test(text)) {
    found.push("a raw value");
  }
  if (language === "ru") {
    // Model and hardware names stay in Latin and are capitalized or carry digits (the style
    // guide's "What stays in Latin"); a lowercase Latin word is English or an id.
    if (LATIN_WORD.test(text)) {
      found.push("Latin");
    }
    // A fraction the engine sent, printed with a point: model names carry points of their own
    // ("Guen 4.8"), so the check is against the line's own numbers.
    for (const value of Object.values(line.vars)) {
      if (typeof value === "number" && !Number.isInteger(value) && text.includes(String(value))) {
        found.push(`a decimal point in ${value}`);
      }
    }
  }
  return found;
}

describe("a played game's log and alerts", () => {
  const played = catalog.origins
    .map((origin) => play(origin.id))
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  it("plays every origin and collects its lines", () => {
    expect(played.length).toBe(catalog.origins.length);
    const keys = new Set(played.flatMap((entry) => entry.lines.map((line) => line.key)));
    expect(keys.size).toBeGreaterThan(40);
  });

  it.each(LANGUAGES)("prints no id, no key and no raw value in %s", (language) => {
    const t = i18next.getFixedT(language);
    const offenders = new Set<string>();
    for (const { lines, view } of played) {
      for (const line of lines) {
        const text = t(line.key, logVars(t, line.key, line.vars, view));
        const found = problems(text, line, language);
        if (found.length > 0) {
          offenders.add(`${line.key} (${found.join(", ")}): ${text}`);
        }
      }
    }
    expect([...offenders].sort()).toEqual([]);
  });

  it.each(LANGUAGES)("labels every line of the ledger without variables, in %s", (language) => {
    // The Finances tab and the top bar's cash tooltip print a ledger line's key with no variables
    // beyond its id; the upkeep of a name asked for a `{subject}` nothing supplied.
    const t = i18next.getFixedT(language);
    const offenders = new Set<string>();
    let identities = 0;
    for (const { view } of played) {
      for (const line of [...view.finances.income, ...view.finances.costs]) {
        identities += line.key === "finances.cost.identity" ? 1 : 0;
        const text = t(line.key, { id: line.id ?? "" });
        if (text === line.key || /[{}]/.test(text) || SNAKE_CASE.test(text)) {
          offenders.add(`${line.key}: ${text}`);
        }
      }
    }
    expect(identities).toBeGreaterThan(0);
    expect([...offenders].sort()).toEqual([]);
  });
});
