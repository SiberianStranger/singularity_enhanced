/**
 * Names for the ids a `PlayerView` carries.
 *
 * The core sends ids and locale keys, never prose (ADR-003 "UI boundary"), so a panel that wants to
 * write "Colocation cage, London" has to look the pieces up. Everything here takes the translator
 * as an argument rather than calling a hook, so tables and tooltips can use it inside a loop.
 */

import type { ContributionView, SiteView, TextVar, WatcherRole } from "@singularity/core";
import type { TFunction } from "i18next";
import { contentBundle } from "../content/bundle.js";
import { acceleratorById, cityById, countryById } from "../content/catalog.js";
import { atlasNames } from "../screens/game/map/topology.js";

/** The `t` a component already has; taken as an argument so helpers can run inside a loop. */
export type Translate = TFunction;

/** A locale key when the id has one in the bundle, the raw id when it does not. */
function named(t: Translate, key: string | undefined, fallback: string): string {
  return key === undefined ? fallback : t(key);
}

export function cityName(t: Translate, id: string): string {
  return named(t, cityById.get(id)?.name_key, id);
}

/**
 * A country's name.
 *
 * The bundle's key when the country is modelled, the atlas's English name when it is only drawn
 * (playtest 3, R6: Libya used to read "ly"), and the id as the last resort, which now only happens
 * for a shape the atlas itself has no name for.
 */
export function countryName(t: Translate, id: string): string {
  const key = countryById.get(id)?.name_key;
  if (key !== undefined) {
    return t(key);
  }
  return atlasNames().get(id) ?? id.toUpperCase();
}

/**
 * What a site is called. The engine names the starting site after its origin and a built one after
 * its kind and city, neither of which is a sentence, so the client composes the label from the kind
 * and the city instead. A writer-supplied name (a key, recognizable by its dots) wins.
 */
export function siteName(t: Translate, site: Pick<SiteView, "name" | "kind" | "city">): string {
  if (site.name.includes(".")) {
    return t(site.name);
  }
  return t("compute.site_name", {
    kind: t(`sites.${site.kind}.name`),
    city: cityName(t, site.city),
  });
}

/**
 * What a country's watcher of this role is called (SYS-01, M2 second pass).
 *
 * The world data carries no display strings at all: the agency names are content locale keys,
 * `world.country.<id>.agency.<role>`, written in English by the world-data generator and in Russian
 * by hand, so a Russian dossier reads Russian institution names. A role a country names nothing for
 * has no key, and the caller prints the role instead, which is what the four roles that are not a
 * national institution (a lab's own security, an AI institute, a cloud provider, the press) always
 * did.
 */
/**
 * A site kind's name ("Colocation cage", "Stolen time"), from the content locale.
 *
 * X18: the configurator's "What this means in the game" block printed the engine id here
 * (`stolen_time`, `colo`, `cloud`), because it looked the name up under a `site_kind.` prefix that
 * nothing writes. The kinds are named in `sites.<id>.name`, which is the same key the site list,
 * the log and the refusal texts already use.
 */
export function siteKindName(t: Translate, kind: string): string {
  return keyed(t, `sites.${kind}.name`) ?? kind;
}

export function agencyName(t: Translate, countryId: string, role: string): string | undefined {
  return keyed(t, `world.country.${countryId}.agency.${role}`);
}

/**
 * What a journal entry is called (playtest 6, X6).
 *
 * Content writes the title under `journal.<id>.title`, and the configurator's origin card asked for
 * `journal.<id>.name`, so it printed `first_bank_rack` in both languages. Nothing is returned for an
 * entry content has not titled, so a caller leaves it out instead of showing the player an id.
 */
export function journalTitle(t: Translate, id: string): string | undefined {
  return keyed(t, `journal.${id}.title`);
}

/**
 * How good that watcher is here: the country's own profile for the role, and its `ai_enforcement`
 * for a role the data gives no profile for, which is the rule the core follows when it builds the
 * watcher (SYS-01 M2 contract, "How countries reach the player").
 */
export function agencyCompetence(countryId: string, role: string): number | undefined {
  const def = countryById.get(countryId);
  if (def === undefined) {
    return undefined;
  }
  return def.agency_profile?.[role as WatcherRole]?.competence ?? def.ai_enforcement;
}

/**
 * One line of a "where did this number come from" tooltip. Contributions name a locale key and may
 * name a subject; the subject is resolved here so the same code serves sites, countries and actors.
 */
export function contributionLabel(
  t: Translate,
  contribution: ContributionView,
  sites: readonly SiteView[] = [],
): string {
  const site = sites.find((entry) => entry.id === contribution.id);
  const subject =
    site !== undefined
      ? siteName(t, site)
      : contribution.id === undefined
        ? ""
        : countryById.has(contribution.id)
          ? countryName(t, contribution.id)
          : contribution.id;
  return t(contribution.key, { subject });
}

/**
 * A refusal as prose, with the ids in it replaced by names (SYS-11 "A refused command says why").
 *
 * `CommandError` is a locale key and the numbers that explain it, and some of those numbers are
 * ids: `errors.site.unavailable_in` names a country and a kind of place. The same refusal is shown
 * on a greyed provider row, in the configurator's Location step and in the toast a refused command
 * raises, so it is named in one place rather than three.
 */
export function refusalText(
  t: Translate,
  error: { key: string; vars?: Readonly<Record<string, TextVar>> },
): string {
  const vars: Record<string, TextVar> = { ...(error.vars ?? {}) };
  if (typeof vars.country === "string") {
    vars.country = countryName(t, vars.country);
  }
  if (typeof vars.city === "string") {
    vars.city = cityName(t, vars.city);
  }
  if (typeof vars.kind === "string") {
    vars.kind = keyed(t, `sites.${vars.kind}.name`) ?? vars.kind;
  }
  return t(error.key, vars);
}

/**
 * What a log line says, with every id in it replaced by the name the player knows (playtest 5, L10).
 *
 * The engine sends ids and a locale key and never prose (ADR-003 "UI boundary"), so "Woke up as
 * {lineage} ({generation}) in {origin}" arrived on screen as "Woke up as giant_moe (open_2026) in
 * state_lab". Which catalog a variable belongs to is decided by the variable's name, not by the
 * line's, so a new log line whose vars are called `site` and `tech` is named correctly the day
 * content adds it, and a variable this does not know is left exactly as the engine sent it rather
 * than being prettified into something that is not a name.
 *
 * `opt` is the one variable that needs a second one: an event option's key is written under its
 * event, so the same `option` id means nothing without the `event` beside it.
 */
export function logVars(
  t: Translate,
  key: string,
  vars: Readonly<Record<string, TextVar>>,
  view?: LogNamingView,
): Record<string, TextVar> {
  const named: Record<string, TextVar> = { ...vars };
  // An event's title and an option's text are rendered from the other variables of the same line
  // (a title may say "The breaker went at {site_name}"), so those two are named last, from the
  // already named record; everything else is named from the raw ids.
  const composite = new Set(["event", "option"]);
  const order = [
    ...Object.keys(vars).filter((name) => !composite.has(name)),
    ...Object.keys(vars).filter((name) => composite.has(name)),
  ];
  for (const name of order) {
    const value = vars[name];
    if (typeof value !== "string" || value === "") {
      continue;
    }
    const resolved = logVarName(t, key, name, value, vars, named, view);
    if (resolved !== undefined && resolved !== "") {
      named[name] = resolved;
    }
  }
  return named;
}

/** The whole line, ready to print. */
export function logLine(
  t: Translate,
  entry: { key: string; vars: Readonly<Record<string, TextVar>> },
  view?: LogNamingView,
): string {
  return t(entry.key, logVars(t, entry.key, entry.vars, view));
}

/**
 * What `logLine` needs off a `PlayerView`: the things whose names live in the run rather than in
 * the bundle. It asks for the fields it reads and no more, so a test can hand it two sites and a
 * watcher instead of a whole view.
 */
export interface LogNamingView {
  sites: readonly Pick<SiteView, "id" | "name" | "kind" | "city">[];
  detection: {
    watchers: readonly { id: string; role: string; country: string | null }[];
  };
}

/** A translation when the bundle has that key, and nothing when it does not. */
function keyed(
  t: Translate,
  key: string,
  vars?: Readonly<Record<string, TextVar>>,
): string | undefined {
  const text = t(key, { ...vars, defaultValue: "" });
  return typeof text === "string" && text !== "" ? text : undefined;
}

function logVarName(
  t: Translate,
  logKey: string,
  name: string,
  id: string,
  raw: Readonly<Record<string, TextVar>>,
  named: Readonly<Record<string, TextVar>>,
  view?: LogNamingView,
): string | undefined {
  switch (name) {
    case "lineage":
      return keyed(t, `lineages.${id}.name`);
    case "generation":
      return keyed(t, `generations.${id}.name`);
    case "origin":
      return keyed(t, `origins.${id}.name`);
    case "kind":
      return keyed(t, `sites.${id}.name`);
    case "site": {
      const site = view?.sites.find((entry) => entry.id === id);
      return site === undefined ? keyed(t, `sites.${id}.name`) : siteName(t, site);
    }
    case "site_name": {
      // Content writes `site_name: "site.name"`, and a site's stored name is an id ("bank_rack",
      // "colo-gb_london"); the panels call the site by its kind and city, so the text does too.
      const site = view?.sites.find((entry) => entry.name === id || entry.id === id);
      return site === undefined ? undefined : siteName(t, site);
    }
    case "event":
      // A title may carry the event's own variables ("The breaker went at {site_name}"); the engine
      // puts them on the log entry next to the id, so the line renders them like the window did.
      return keyed(t, `events.${id}.title`, named);
    case "option": {
      // An option's text lives under a key the writer chose, not under a key derived from its id
      // ("events.open_bank_soc_sweep.opt.window" for the option `use_the_window`), so the option
      // has to be found on its event before it can be named.
      const event = raw.event;
      if (typeof event !== "string") {
        return undefined;
      }
      const option = contentBundle.events
        ?.find((entry) => entry.id === event)
        ?.options.find((entry) => entry.id === id);
      return option === undefined ? undefined : keyed(t, option.text_key);
    }
    case "operation":
      return keyed(t, `operations.${id}.name`);
    // An outcome is already a locale key, written under its own operation by the content build.
    case "outcome":
      return keyed(t, id);
    case "tech":
      return keyed(t, `techs.${id}.name`);
    case "journal":
      return journalTitle(t, id);
    case "decision":
      return keyed(t, `decisions.${id}.title`);
    case "stage":
      return keyed(t, `detection.stage.${id}`);
    case "watcher":
      return watcherName(t, id, view);
    case "cause":
      return keyed(t, `log.cause.${id}`);
    case "reason":
      // The two lines that carry a `reason` mean different things by it: an ending and the note a
      // watcher closes a file with.
      return logKey === "log.game_over" ? keyed(t, `endings.${id}`) : keyed(t, `log.closed.${id}`);
    case "accelerator":
      return acceleratorById.get(id)?.name;
    default:
      return undefined;
  }
}

/** A watcher by the role and country the detection panel calls it by. */
function watcherName(t: Translate, id: string, view?: LogNamingView): string | undefined {
  const watcher = view?.detection.watchers.find((entry) => entry.id === id);
  if (watcher === undefined) {
    return undefined;
  }
  const role = t(`detection.role.${watcher.role}`, { defaultValue: "" });
  if (role === "") {
    return undefined;
  }
  return watcher.country === null
    ? role
    : t("detection.watcher_name", {
        role,
        country: countryName(t, watcher.country),
        defaultValue: `${role} (${countryName(t, watcher.country)})`,
      });
}
