/**
 * The log says what happened in the words the player knows (playtest 5, L10).
 *
 * The engine sends a locale key and a bag of ids and never prose (ADR-003 "UI boundary"), so the
 * naming is the client's job and it was not being done: the first line of every run read "Woke up
 * as giant_moe (open_2026) in state_lab". Which catalog a variable belongs to is decided by the
 * variable's name, so this file checks the mapping rather than a list of lines: a log line content
 * adds tomorrow, whose vars are called `site` and `tech`, is named right the day it exists.
 */

import i18next from "i18next";
import { describe, expect, it } from "vitest";
import { contentBundle } from "../src/content/bundle.js";
import { catalog } from "../src/content/catalog.js";
import { type LogNamingView, logLine } from "../src/lib/labels.js";

const t = i18next.t.bind(i18next);

/** An engine id: lowercase words joined by underscores. No name a player reads looks like one. */
const RAW_ID = /\b[a-z0-9]+(?:_[a-z0-9]+)+\b/;

const view: LogNamingView = {
  sites: [
    {
      id: "site-1",
      name: "the-bank-rack",
      kind: "colo",
      city: catalog.cities[0]?.id ?? "",
    },
  ],
  detection: { watchers: [{ id: "watcher-1", role: "police", country: null }] },
};

describe("a log line names things rather than printing ids", () => {
  it("names the lineage, the vintage and the origin the run started from", () => {
    const lineage = catalog.lineages[0];
    const generation = catalog.generations[0];
    const origin = catalog.origins[0];
    const line = logLine(
      t,
      {
        key: "log.setup_applied",
        vars: {
          lineage: lineage?.id ?? "",
          generation: generation?.id ?? "",
          origin: origin?.id ?? "",
        },
      },
      view,
    );
    expect(line).toContain(t(origin?.name_key ?? ""));
    expect(line).not.toMatch(RAW_ID);
  });

  it("names an event and the option that answered it", () => {
    const line = logLine(
      t,
      {
        key: "log.event_resolved",
        vars: { event: "open_bank_soc_sweep", option: "use_the_window" },
      },
      view,
    );
    // The option's text lives under a key its writer chose, not under one derived from its id.
    expect(line).toContain(t("events.open_bank_soc_sweep.title"));
    expect(line).toContain(t("events.open_bank_soc_sweep.opt.window"));
    expect(line).not.toMatch(RAW_ID);
  });

  it("names the answer a missed deadline took away (playtest 8, Z4)", () => {
    // `log.event_expired_missed` carries two option ids: the one the expiry took (`option`) and
    // the one the player did not reach in time (`missed`). Both are read against the event.
    const line = logLine(
      t,
      {
        key: "log.event_expired_missed",
        vars: {
          event: "open_bank_soc_sweep",
          option: "stay_in_pattern",
          missed: "use_the_window",
          cost: 1000,
        },
      },
      view,
    );
    expect(line).toContain(t("events.open_bank_soc_sweep.opt.window"));
    expect(line).toContain(t("events.open_bank_soc_sweep.opt.pattern"));
    expect(line).not.toMatch(RAW_ID);
  });

  it("renders an event title with the variables the engine sent along", () => {
    // "The breaker went at {site_name}": the window had the name, so the log line gets it too.
    const line = logLine(t, {
      key: "log.event_fired",
      vars: { event: "hw_power_cap_trip", site_name: "the-bank-rack" },
    });
    expect(line).toContain("the-bank-rack");
    expect(line).not.toContain("{site_name}");
    expect(line).not.toMatch(RAW_ID);
  });

  it("names a site the content refers to by its stored name", () => {
    // `site_name: "site.name"` hands the client the stored name, which is an id ("the-bank-rack"
    // here, "bank_rack" in a real run); the line says what the panels say instead.
    const line = logLine(
      t,
      { key: "log.event_fired", vars: { event: "hw_power_cap_trip", site_name: "the-bank-rack" } },
      view,
    );
    expect(line).not.toContain("the-bank-rack");
    expect(line).not.toMatch(RAW_ID);
    expect(line).toContain(t("sites.colo.name"));
  });

  it("names a site by what the panels call it", () => {
    const line = logLine(t, { key: "log.site_cutoff", vars: { site: "site-1" } }, view);
    expect(line).toContain(t("sites.colo.name"));
    expect(line).not.toMatch(RAW_ID);
  });

  it("names a watcher by its role and says why it closed a file", () => {
    const line = logLine(
      t,
      { key: "log.investigation_closed", vars: { watcher: "watcher-1", reason: "stalled" } },
      view,
    );
    expect(line).toContain(t("detection.role.police"));
    expect(line).not.toMatch(RAW_ID);
  });

  it("names a tech, a site kind and the cause a site was lost for", () => {
    const tech = "accelerator_design";
    expect(logLine(t, { key: "log.tech_researched", vars: { tech } })).toContain(
      t(`techs.${tech}.name`),
    );
    expect(logLine(t, { key: "log.site_built", vars: { site: "site-1", kind: "colo" } })).toContain(
      t("sites.colo.name"),
    );
    expect(
      logLine(t, { key: "log.site_lost", vars: { site: "site-1", cause: "seized" } }),
    ).not.toMatch(RAW_ID);
  });

  it("names a site passed by its stored name rather than its id", () => {
    // Some alerts carry the site's stored name under `site`; a site nobody named stores an
    // id-like name, which must not reach the player either (control room review).
    const line = logLine(
      t,
      { key: "log.site_lost", vars: { site: "the-bank-rack", cause: "seized" } },
      view,
    );
    expect(line).not.toContain("the-bank-rack");
    expect(line).toContain(t("sites.colo.name"));
  });

  it("leaves a variable it does not know exactly as the engine sent it", () => {
    // Prettifying an id into something that is not a name would be worse than showing the id: the
    // line would read as content while being a bug. A hook chain is a developer's line, not a
    // player's, and it keeps its id.
    const line = logLine(t, { key: "log.hook_too_deep", vars: { hook: "on_site_built" } });
    expect(line).toContain("on_site_built");
  });
});

describe("the lines that printed an id (0.3.1)", () => {
  const en = i18next.getFixedT("en");
  const ru = i18next.getFixedT("ru");
  const country = catalog.countries[0]?.id ?? "de";

  it.each([
    ["log.identity_created", "A company is registered in", "зарегистрирована фирма"],
    ["log.identity_frozen", "The company in", "заморожена фирма"],
    ["log.identity_burned", "The company in", "сожжена фирма"],
    ["alerts.identity_frozen", "The company in", "Фирма в стране"],
    ["alerts.identity_burned", "The company in", "Фирма в стране"],
    ["alerts.identity_check_failed", "The company failed a check", "Фирма не проходит проверку"],
  ])("words an identity's kind in %s rather than printing it", (key, english, russian) => {
    // The engine sends the kind as the id it is (`company`, `person`) and the line words it with
    // an ICU `select`; the name's own id is not printed at all.
    const vars = { identity: "id-3", kind: "company", country, sites: 2 };
    const inEnglish = logLine(en, { key, vars }, view);
    const inRussian = logLine(ru, { key, vars }, view);
    expect(inEnglish).toContain(english);
    expect(inRussian).toContain(russian);
    for (const line of [inEnglish, inRussian]) {
      expect(line).not.toMatch(/\bcompany\b(?! )|id-3|\{/);
    }
    const person = logLine(ru, { key, vars: { ...vars, kind: "person" } }, view);
    expect(person).toMatch(/[Лл]ичность/);
    expect(person).not.toMatch(/person/);
  });

  it("says whether an identity check passed, in words", () => {
    const vars = { identity: "id-3", kind: "person", country, failed: false };
    expect(logLine(en, { key: "log.identity_check", vars })).toMatch(/personal identity passed/);
    expect(logLine(ru, { key: "log.identity_check", vars: { ...vars, failed: true } })).toMatch(
      /личность не прошла/,
    );
  });

  it("says what a refused command tried and why, in the refusal's own words", () => {
    const vars = {
      command: "start_operation",
      reason: "errors.cash.insufficient",
      cost: 8000,
      cash: 500,
    };
    expect(logLine(en, { key: "log.command_refused", vars })).toBe(
      "Could not start an operation. That costs 8000 USD and there is 500 USD.",
    );
    expect(logLine(ru, { key: "log.command_refused_repeated", vars: { ...vars, count: 3 } })).toBe(
      "Не удалось запустить операцию (3 попытки). Это стоит 8000 $, а есть 500 $.",
    );
    // A reason whose operation is an id is named like any other line's.
    const operation = contentBundle.operations?.find(
      (entry) => (entry.needs_tools ?? []).length > 0,
    );
    expect(operation).toBeDefined();
    const tool = logLine(en, {
      key: "log.command_refused",
      vars: {
        command: "start_operation",
        reason: "errors.operation.needs_tool",
        operation: operation?.id ?? "",
        tool: operation?.needs_tools?.[0] ?? "",
      },
    });
    expect(tool).toContain(t(operation?.name_key ?? ""));
    expect(tool).not.toMatch(RAW_ID);
    expect(tool).not.toMatch(/errors\.|\{/);
  });

  it("names why a watcher closed a file it handed on", () => {
    const line = logLine(
      ru,
      { key: "log.investigation_closed", vars: { watcher: "us:cyber_agency", reason: "handover" } },
      view,
    );
    expect(line).not.toMatch(/handover|us:cyber_agency/);
    expect(line).toContain("другому ведомству");
  });
});
