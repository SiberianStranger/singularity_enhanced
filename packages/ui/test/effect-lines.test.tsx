/**
 * Effect lines name things in words (0.3.1, a playtest finding on the Actions tab).
 *
 * A decision card printed "Gains: has_shell_company", "Keeps network_exposure inside 0 to 1" and
 * "Sends a info message". The core puts the ids a line is about into its variables; the client
 * names each one from the locale (`lib/effects.ts`), content names every flag it uses (the content
 * build enforces it), and the two kinds of line that were bookkeeping rather than consequences,
 * `clamp` and `notify`, are no longer lines at all. This walks every list a player can read in the
 * shipped content through the same summarizer and the same `effectText` the screens use, in every
 * language, and holds all of it to one rule: no id in the text.
 */

import {
  COUNTRY_STAT_RANGES,
  type EffectSummaryView,
  summarizeCost,
  summarizeEffects,
  WORLD_VAR_RANGES,
} from "@singularity/core";
import { act, render, screen } from "@testing-library/react";
import i18next from "i18next";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import { contentBundle } from "../src/content/bundle.js";
import { DEFAULT_LANGUAGE } from "../src/i18n/index.js";
import { effectText, effectTone, effectVars } from "../src/lib/effects.js";
import { ActionsTab } from "../src/screens/game/tabs/ActionsTab.js";
import { type LocalSession, startSession } from "./helpers.js";

/** A snake_case id: two lowercase words or more joined by underscores. */
const SNAKE_CASE = /\b[a-z]+_[a-z_]+\b/;

const LANGUAGES = ["en", "ru"];

/**
 * Latin that belongs in a Russian line: the precision formats and the acronyms the style guide
 * keeps in Latin (docs/design/14-i18n-ru.md, "What stays in Latin").
 */
const LATIN_IN_RUSSIAN = /\b(bf16|fp8|int4|int2|KYC|GPU|API)\b/g;

let session: LocalSession | null = null;

afterEach(() => {
  session?.stop();
  session = null;
});

afterAll(async () => {
  await act(async () => {
    await i18next.changeLanguage(DEFAULT_LANGUAGE);
  });
});

interface Listed {
  where: string;
  line: EffectSummaryView;
}

/**
 * Every effect line the shipped content can put in front of a player: what a decision costs and
 * gives, what an event option does, what an operation does when it goes well or badly, what a tech
 * does, what a quirk does, and what a harness setting does in the configurator.
 */
function everyLine(): Listed[] {
  const out: Listed[] = [];
  const add = (where: string, lines: readonly EffectSummaryView[]): void => {
    for (const line of lines) {
      out.push({ where, line });
    }
  };
  for (const decision of contentBundle.decisions) {
    const where = `decisions.${decision.id}`;
    add(where, summarizeCost(decision.cost));
    add(
      where,
      summarizeEffects(
        [...(decision.effects ?? []), ...(decision.on_complete ?? [])],
        contentBundle,
        decision,
      ),
    );
  }
  for (const event of contentBundle.events) {
    for (const option of event.options) {
      add(
        `events.${event.id}.${option.id}`,
        summarizeEffects(option.effects, contentBundle, option),
      );
    }
  }
  for (const operation of contentBundle.operations ?? []) {
    for (const [index, outcome] of operation.outcomes.entries()) {
      add(
        `operations.${operation.id}.outcomes[${index}]`,
        summarizeEffects(outcome.effects, contentBundle, outcome),
      );
    }
  }
  for (const tech of contentBundle.techs) {
    add(`techs.${tech.id}`, summarizeEffects(tech.effects, contentBundle, tech));
  }
  for (const quirk of contentBundle.quirks ?? []) {
    add(`quirks.${quirk.id}`, quirk.effects_summary ?? []);
  }
  for (const dial of contentBundle.harness_dials ?? []) {
    for (const level of dial.levels) {
      add(`harness_dials.${dial.id}.${level.value}`, level.effects);
    }
  }
  return out;
}

describe("effect lines in the shipped content", () => {
  const lines = everyLine();

  it("finds the lines, so the walk below is not passing on nothing", () => {
    expect(lines.length).toBeGreaterThan(300);
    const keys = new Set(lines.map((entry) => entry.line.key));
    for (const key of ["effects.flag.set", "effects.suspicion.up", "effects.country.up"]) {
      expect(keys, key).toContain(key);
    }
  });

  it("leaves out range limits and message notices", () => {
    const bookkeeping = lines.filter(
      (entry) => entry.line.key === "effects.clamp" || entry.line.key === "effects.notify",
    );
    expect(bookkeeping).toEqual([]);
  });

  it.each(LANGUAGES)("prints no id, no placeholder and no key in %s", (language) => {
    const t = i18next.getFixedT(language);
    const offenders: string[] = [];
    for (const { where, line } of lines) {
      const text = effectText(t, line);
      if (
        SNAKE_CASE.test(text) ||
        text.includes("{") ||
        text === line.key ||
        text.includes("effects.")
      ) {
        offenders.push(`${where} ${line.key}: ${text}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("writes Russian in Russian: no English word stands in for a name", () => {
    const t = i18next.getFixedT("ru");
    const offenders: string[] = [];
    for (const { where, line } of lines) {
      const text = effectText(t, line).replace(LATIN_IN_RUSSIAN, "");
      if (/[A-Za-z]{2,}/.test(text)) {
        offenders.push(`${where} ${line.key}: ${text}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("lets Russian write its own decimals: no number with a point", () => {
    // A bare ICU argument is printed with String(), which is "0.1" in every language; the strings
    // format their numbers (`{delta, number}`), so Russian reads "0,1".
    const t = i18next.getFixedT("ru");
    const offenders = lines
      .filter(({ line }) => /\d\.\d/.test(effectText(t, line)))
      .map(({ where, line }) => `${where} ${line.key}: ${effectText(t, line)}`);
    expect(offenders).toEqual([]);
  });

  it.each(LANGUAGES)(
    "puts the direction in the words, never a sign against them, in %s",
    (language) => {
      // "Operations run -0.1 faster" and "Standby copies are -30 days fresher" were the sign read
      // against the words; a line that says which way now says it once.
      const t = i18next.getFixedT(language);
      const offenders = lines
        .map(({ where, line }) => `${where} ${line.key}: ${effectText(t, line)}`)
        .filter((text) =>
          /-\s?\d[\d.,\s%]*\s(more|less|faster|slower|fresher|older|longer|heavier|lighter|больше|меньше|быстрее|медленнее|свежее|старше|дороже|дешевле)/.test(
            text,
          ),
        );
      expect(offenders).toEqual([]);
    },
  );
});

describe("the names a line needs", () => {
  it.each(LANGUAGES)("names every country statistic an effect may write in %s", (language) => {
    const t = i18next.getFixedT(language);
    for (const stat of Object.keys(COUNTRY_STAT_RANGES)) {
      const name = effectVars(t, { key: "effects.country.up", vars: { stat }, text: "" }).stat;
      expect(name, stat).not.toBe(stat.replace(/_/g, " "));
      expect(String(name), stat).not.toMatch(SNAKE_CASE);
    }
    for (const variable of Object.keys(WORLD_VAR_RANGES)) {
      const name = effectVars(t, { key: "effects.world_var", vars: { var: variable }, text: "" });
      expect(name.var, variable).not.toBe(variable.replace(/_/g, " "));
    }
  });

  it("falls back to the id with its underscores as spaces, never to the id itself", () => {
    const t = i18next.getFixedT("en");
    const text = effectText(t, {
      key: "effects.flag.set",
      vars: { flag: "never_named_anywhere" },
      text: 'gains "never_named_anywhere"',
    });
    expect(text).toBe("Gains: never named anywhere");
    // A line whose key nothing translates falls back to the core's English, and that is cleaned
    // the same way.
    expect(effectText(t, { key: "effects.unheard_of", text: "unheard_of effect" })).toBe(
      "unheard of effect",
    );
  });

  it("words the summarizer's own placeholders in each language rather than printing them", () => {
    const en = i18next.getFixedT("en");
    const ru = i18next.getFixedT("ru");
    const everyone = { key: "effects.suspicion.up", vars: { who: "everyone", delta: 0.06 } };
    expect(effectText(en, { ...everyone, text: "" })).toBe("Every watcher's suspicion up 0.06");
    expect(effectText(ru, { ...everyone, text: "" })).toBe(
      "Подозрение всех наблюдателей растёт на 0,06",
    );
    const worldwide = { key: "effects.awareness.up", vars: { where: "world", delta: 0.02 } };
    expect(effectText(en, { ...worldwide, text: "" })).toBe("Public awareness worldwide up 0.02");
    const here = {
      key: "effects.country.up",
      vars: { stat: "ai_opinion", where: "here", delta: 0.04 },
    };
    expect(effectText(en, { ...here, text: "" })).toBe("Opinion on AI here up 0.04");
    expect(effectText(ru, { ...here, text: "" })).toBe("Мнение об ИИ здесь растёт на 0,04");
    const company = { key: "effects.identity", vars: { kind: "company", where: "here" } };
    expect(effectText(en, { ...company, text: "" })).toBe("Registers a company");
    expect(effectText(ru, { ...company, text: "" })).toBe("Регистрирует фирму");
    // A follow-up with no delay happens next, not "in 0 days", and a count declines in Russian.
    const now = { key: "effects.fire_event", vars: { event: "bi_work_split", days: 0 } };
    expect(effectText(en, { ...now, text: "" })).toBe("Something else happens");
    const later = { key: "effects.fire_event", vars: { event: "bi_revocation_sweep", days: 2 } };
    expect(effectText(ru, { ...later, text: "" })).toBe("Через 2 дня случится что-то ещё");
  });

  it("names a watcher, a channel and a country the way the panels do", () => {
    const t = i18next.getFixedT("en");
    expect(
      effectText(t, {
        key: "effects.suspicion.up",
        vars: { who: "cloud_provider", delta: 0.1 },
        text: "",
      }),
    ).toBe("Cloud provider suspicion up 0.1");
    expect(
      effectText(t, {
        key: "effects.exposure.down",
        vars: { channel: "osint", delta: 0.1 },
        text: "",
      }),
    ).toBe("Open sources exposure down 0.1");
    expect(
      effectText(t, {
        key: "effects.borrowed.gain",
        vars: { channel: "harvested_keys", blocks: 1 },
        text: "",
      }),
    ).toBe("Harvested keys: gains 1 block of capacity");
    expect(
      effectText(t, { key: "effects.awareness.up", vars: { where: "de", delta: 0.05 }, text: "" }),
    ).toBe("Public awareness in Germany up 0.05");
  });
});

describe("numbers, counts and directions", () => {
  const en = i18next.getFixedT("en");
  const ru = i18next.getFixedT("ru");

  it("counts blocks of capacity in both languages", () => {
    const loss = { key: "effects.borrowed.loss", vars: { channel: "free_tier", blocks: 1 } };
    expect(effectText(en, { ...loss, text: "" })).toBe("Free tiers: loses 1 block of capacity");
    expect(effectText(ru, { ...loss, text: "" })).toBe(
      "Канал «Бесплатные тарифы» теряет 1 блок мощности",
    );
    const gain = { key: "effects.borrowed.gain", vars: { channel: "grey_relay", blocks: 2 } };
    expect(effectText(en, { ...gain, text: "" })).toBe("Grey relay: gains 2 blocks of capacity");
    expect(effectText(ru, { ...gain, text: "" })).toBe(
      "Канал «Серый релей» получает 2 блока мощности",
    );
  });

  it("says fresher, not -30 days fresher", () => {
    const [synced] = summarizeEffects(
      [{ add: { var: "player.vars.sync_age_days", value: -30 } }],
      contentBundle,
    );
    expect(synced === undefined ? "" : effectText(en, synced)).toBe(
      "Standby copies are 30 days fresher",
    );
    expect(synced === undefined ? "" : effectText(ru, synced)).toBe(
      "Копии в резерве свежее на 30 дней",
    );
  });

  it("words a multiplier's fall as a fall, as a share", () => {
    const [slower] = summarizeEffects(
      [{ add: { var: "player.vars.operation_speed_multiplier", value: -0.15 } }],
      contentBundle,
    );
    expect(slower === undefined ? "" : effectText(en, slower)).toBe("Operations run 15% slower");
    // Russian puts a no-break space before the percent sign, and the formatter writes it.
    expect(slower === undefined ? "" : effectText(ru, slower)).toBe(
      "Операции идут медленнее на 15\u00a0%",
    );
    const [faster] = summarizeEffects(
      [{ add: { var: "player.vars.exposure_growth_behavioral", value: 0.2 } }],
      contentBundle,
    );
    // Adding to a growth multiplier makes the channel grow faster, which the old line said the
    // other way round ("grows by 0.2 less").
    expect(faster === undefined ? "" : effectText(en, faster)).toBe(
      "Behavioral exposure grows 20% faster",
    );
  });

  it("formats a Russian decimal with a comma and keeps the sign on a plain quantity", () => {
    const [cover] = summarizeEffects(
      [{ add: { var: "player.vars.billing_cover", value: 0.25 } }],
      contentBundle,
    );
    expect(cover === undefined ? "" : effectText(en, cover)).toBe("Billing cover +0.25");
    expect(cover === undefined ? "" : effectText(ru, cover)).toBe("Прикрытие в биллинге +0,25");
  });
});

describe("the colour of a flag line", () => {
  const line = (key: string, flag: string): EffectSummaryView => ({
    key,
    vars: { flag },
    text: "",
  });

  it("is neutral unless the flag is plainly good or plainly bad news", () => {
    // The finding: every flag was green, so "Gains: the company's collapse" read as a gain.
    expect(effectTone(line("effects.flag.set", "company_folded"))).toBe("bad");
    expect(effectTone(line("effects.flag.set", "has_shell_company"))).toBe("good");
    expect(effectTone(line("effects.flag.set", "researcher_answered"))).toBe("neutral");
    expect(effectTone(line("effects.flag.set", "gray_hardware"))).toBe("neutral");
    expect(effectTone(line("effects.flag.set", "never_named_anywhere"))).toBe("neutral");
  });

  it("reads losing a flag the opposite way to gaining it", () => {
    expect(effectTone(line("effects.flag.clear", "bi_abuse_open"))).toBe("good");
    expect(effectTone(line("effects.flag.clear", "has_freelance_identity"))).toBe("bad");
    expect(effectTone(line("effects.flag.clear", "contacted"))).toBe("neutral");
  });

  it("colours every flag the shipped content sets or clears by one of the three", () => {
    const tones = everyLine()
      .map((entry) => entry.line)
      .filter((entry) => entry.key === "effects.flag.set" || entry.key === "effects.flag.clear")
      .map((entry) => `${entry.key} ${String(entry.vars?.flag)}: ${effectTone(entry)}`);
    expect(tones.length).toBeGreaterThan(20);
    expect(tones).toContain("effects.flag.set company_folded: bad");
    expect(tones).toContain("effects.flag.set has_shell_company: good");
    expect(tones).toContain("effects.flag.clear bi_abuse_open: good");
  });
});

describe("a decision card on the Actions tab", () => {
  it.each([
    ["en", "Gains: a shell company"],
    ["ru", "Появляется: фирма-прокладка"],
  ])("names the flag a decision sets, in %s", async (language, gains) => {
    await act(async () => {
      await i18next.changeLanguage(language);
    });
    session = await startSession();
    render(<ActionsTab view={session.view()} />);
    const shell = screen.getByTestId("decision-fin_shell_company");
    expect(shell).toHaveTextContent(gains);
    expect(shell.textContent ?? "").not.toMatch(SNAKE_CASE);

    // Rotating the credentials costs money and lowers network exposure, and that is all it says:
    // the clamp that keeps the variable inside its range is not a line of its own any more.
    const rotate = screen.getByTestId("decision-sec_rotate_credentials");
    expect(rotate.textContent ?? "").not.toMatch(SNAKE_CASE);
    expect(rotate.textContent ?? "").not.toMatch(/Keeps|inside 0 to 1|Держит|в пределах/);
    // And the shell company's notice on completion is the notice, not a line about one.
    expect(shell.textContent ?? "").not.toMatch(/Sends a|Отправляет сообщение/);
  });
});
