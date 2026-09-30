/**
 * Why something cannot be taken, in words (0.3.1, a playtest finding in the event window).
 *
 * A greyed event option said "requirements.flag.has_shell_company": the engine lists a locale key
 * per unmet requirement, and the window printed the key. Two families of key carry an id and are
 * worded around its name by `reasonText` ("Needs a shell company"); every other key reads whole.
 * This walks every reason the shipped content can put in front of a player, worded the way the
 * screen that shows it words it, in every language:
 *
 * - an event option's, in the event window (`reasonText`);
 * - a tech's, on the Research tab (`reasonText`);
 * - a decision's and an operation offer's, on the Actions tab, which prints the key as it is;
 * - the refusal a command raises when it is sent anyway, in the notice stack (`logVars`).
 *
 * The first half walks every key the content's conditions and the commands' refusals can produce;
 * the second plays every origin for a month and walks what the engine actually said.
 */

import {
  createGame,
  EGRESS_BLOCK_AIR_GAPPED,
  EGRESS_BLOCK_SANDBOXED,
  optionCashCost,
  type PendingChoice,
  type PlayerView,
  requirementKeysOf,
  SANDBOX_ALLOWS_EGRESS,
  type TextVar,
} from "@singularity/core";
import { act, fireEvent, render, screen } from "@testing-library/react";
import i18next from "i18next";
import { IntlMessageFormat } from "intl-messageformat";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import { contentBundle } from "../src/content/bundle.js";
import { catalog } from "../src/content/catalog.js";
import { DEFAULT_LANGUAGE } from "../src/i18n/index.js";
import {
  type LogNamingView,
  logVars,
  optionTextVars,
  reasonText,
  type Translate,
} from "../src/lib/labels.js";
import { EventWindow } from "../src/screens/game/EventWindow.js";
import { type LocalSession, originSetup, startSession } from "./helpers.js";

const LANGUAGES = ["en", "ru"] as const;

/** A locale key left in the text: `requirements.cash`, `errors.operation.locked`. */
const RAW_KEY = /\b[a-z][a-z0-9_]*(?:\.[a-z0-9_]+)+\b/;

/** A snake_case id: two lowercase words or more joined by underscores. */
const SNAKE_CASE = /\b[a-z]+_[a-z_]+\b/;

/**
 * Latin that belongs in a Russian line: the precision formats and the acronyms the style guide
 * keeps in Latin (docs/design/14-i18n-ru.md, "What stays in Latin").
 */
const LATIN_IN_RUSSIAN = /\b(bf16|fp8|int4|int2|KYC|GPU|API)\b/g;

/** How the screen that shows a reason words it. */
type Wording = "reason" | "plain" | "refusal";

interface Shown {
  where: string;
  key: string;
  wording: Wording;
  vars?: Record<string, TextVar>;
}

function worded(t: Translate, shown: Shown, view?: LogNamingView): string {
  switch (shown.wording) {
    case "reason":
      return reasonText(t, shown.key, shown.vars);
    case "plain":
      return t(shown.key);
    default:
      return t(shown.key, logVars(t, shown.key, shown.vars ?? {}, view));
  }
}

/** What is wrong with one worded reason, or nothing. */
function problems(text: string, key: string, language: string): string[] {
  const found: string[] = [];
  if (text.trim() === "") {
    found.push("empty");
  }
  if (text === key || RAW_KEY.test(text)) {
    found.push("a key");
  }
  if (/[{}]/.test(text)) {
    found.push("a placeholder");
  }
  if (SNAKE_CASE.test(text)) {
    found.push("an id");
  }
  if (/\b(undefined|NaN)\b/.test(text)) {
    found.push("a raw value");
  }
  if (language === "ru") {
    if (/[A-Za-z]{2,}/.test(text.replace(LATIN_IN_RUSSIAN, ""))) {
      found.push("Latin");
    }
    if (/\d\.\d/.test(text)) {
      found.push("a decimal point");
    }
  }
  return found;
}

/**
 * Every reason the shipped content can produce, from the definitions: what `blockedBy` can list
 * for a condition (`requirementKeysOf`), what `decisionStatus` can answer, what an offer adds for
 * the harness, the attention and the price, and what `start_operation` and `take_decision` refuse
 * with.
 */
function everyReason(): Shown[] {
  const out: Shown[] = [];
  for (const event of contentBundle.events) {
    for (const option of event.options) {
      for (const key of requirementKeysOf(option.enabled_if)) {
        out.push({ where: `events.${event.id}.${option.id}`, key, wording: "reason" });
      }
    }
  }
  // An option the engine disabled for a reason no condition names.
  out.push({ where: "events", key: "errors.event.option_disabled", wording: "reason" });

  for (const tech of contentBundle.techs) {
    for (const key of requirementKeysOf(tech.requires)) {
      out.push({ where: `techs.${tech.id}`, key, wording: "reason" });
    }
  }

  for (const decision of contentBundle.decisions) {
    const where = `decisions.${decision.id}`;
    const keys = [
      decision.visible_if === undefined ? null : "errors.decision.not_visible",
      decision.repeatable === true ? null : "errors.decision.already_taken",
      decision.cooldown_days === undefined ? null : "errors.decision.on_cooldown",
      decision.duration_days === undefined ? null : "errors.decision.in_progress",
      (decision.cost?.cash ?? 0) > 0 ? "errors.decision.cannot_afford" : null,
      decision.enabled_if === undefined ? null : "errors.decision.not_enabled",
    ];
    for (const key of keys) {
      if (key !== null) {
        out.push({ where, key, wording: "plain" });
        out.push({ where, key, wording: "refusal", vars: { decision: decision.id } });
      }
    }
  }

  const closedSandboxes = Object.entries(SANDBOX_ALLOWS_EGRESS)
    .filter(([, allows]) => !allows)
    .map(([id]) => id);
  const channels = (contentBundle.borrowed_channels ?? []).map((channel) => channel.id);
  for (const operation of contentBundle.operations ?? []) {
    const where = `operations.${operation.id}`;
    const id = operation.id;
    const offer = [...requirementKeysOf(operation.requires), "requirements.attention"];
    const refusals: [string, Record<string, TextVar>][] = [
      ["errors.operation.attention", { operation: id, needed: operation.cost.attention, free: 0 }],
    ];
    if (operation.requires !== undefined) {
      refusals.push(["errors.operation.locked", { operation: id }]);
    }
    if (operation.repeatable === false) {
      refusals.push(["errors.operation.not_repeatable", { operation: id }]);
    }
    for (const tool of operation.needs_tools ?? []) {
      offer.push(`harness.tools.${tool}`);
      refusals.push(["errors.operation.needs_tool", { operation: id, tool }]);
    }
    if (operation.needs_egress === true) {
      offer.push("equipment.error.offline", EGRESS_BLOCK_AIR_GAPPED, EGRESS_BLOCK_SANDBOXED);
      for (const sandbox of closedSandboxes) {
        refusals.push(["errors.operation.sandboxed", { operation: id, sandbox }]);
      }
    }
    const compute = operation.cost.compute_hours_per_day ?? 0;
    if (compute > 0) {
      // A cost the harness and the quirks have scaled, and a free share rounded to a tenth.
      refusals.push([
        "errors.operation.compute",
        { operation: id, needed: compute * 1.25, free: 0.5 },
      ]);
    }
    for (const channel of channels) {
      refusals.push(["errors.operation.refused", { operation: id, channel }]);
    }
    const cash = operation.cost.cash_usd ?? 0;
    if (cash > 0) {
      offer.push("requirements.cash");
      refusals.push(["errors.cash.insufficient", { cost: cash, cash: 0 }]);
    }
    for (const key of offer) {
      out.push({ where, key, wording: "plain" });
    }
    for (const [key, vars] of refusals) {
      out.push({ where, key, wording: "refusal", vars });
    }
  }
  return out;
}

interface Played {
  shown: Shown;
  view: PlayerView;
}

/**
 * What the engine said while every origin played its first month: the reasons on the offers, the
 * decisions and the pending options, and the refusals of every operation and decision sent anyway,
 * on the first day and the last.
 */
function playedReasons(): { played: Played[]; origins: number } {
  const played: Played[] = [];
  let origins = 0;
  for (const origin of catalog.origins) {
    const setup = originSetup(origin.id, `reasons-${origin.id}`);
    if (setup === null) {
      continue;
    }
    origins += 1;
    const game = createGame({ content: contentBundle, setup });
    const listed = (): void => {
      const view = game.snapshot("p1");
      for (const offer of view.operation_offers) {
        for (const key of offer.blocked_by) {
          played.push({
            shown: { where: `${origin.id} ${offer.id}`, key, wording: "plain" },
            view,
          });
        }
      }
      for (const decision of view.decisions) {
        if (decision.blocked_reason !== undefined) {
          const shown: Shown = {
            where: `${origin.id} ${decision.id}`,
            key: decision.blocked_reason,
            wording: "plain",
          };
          played.push({ shown, view });
        }
      }
      for (const event of view.events) {
        for (const option of event.options) {
          if (option.blocked_reason !== undefined) {
            const where = `${origin.id} ${event.event_id}.${option.id}`;
            played.push({ shown: { where, key: option.blocked_reason, wording: "reason" }, view });
          }
        }
      }
    };
    const refused = (): void => {
      const view = game.snapshot("p1");
      const commands = [
        ...view.operation_offers.map((offer) => ({
          type: "start_operation" as const,
          playerId: "p1",
          operationId: offer.id,
        })),
        ...view.decisions.map((decision) => ({
          type: "take_decision" as const,
          playerId: "p1",
          id: decision.id,
        })),
      ];
      // Twice, so the second of each meets what the first one spent or started.
      for (const command of [...commands, ...commands]) {
        const result = game.command(command);
        const error = result.ok ? undefined : result.error;
        if (error !== undefined) {
          const where = `${origin.id} ${command.type}`;
          const shown: Shown =
            typeof error === "string"
              ? { where, key: error, wording: "refusal" }
              : { where, key: error.key, wording: "refusal", vars: { ...(error.vars ?? {}) } };
          played.push({ shown, view: game.snapshot("p1") });
        }
      }
    };
    listed();
    refused();
    for (let day = 1; day <= 30; day += 1) {
      for (const choice of game.snapshot("p1").pending) {
        const option = choice.options.find((entry) => entry.enabled);
        if (option !== undefined) {
          game.command({
            type: "resolve_event",
            playerId: "p1",
            instanceId: choice.instanceId,
            optionId: option.id,
          });
        }
      }
      game.tick(24);
      if (day % 10 === 0) {
        listed();
      }
    }
    refused();
  }
  return { played, origins };
}

describe("every reason the shipped content can give", () => {
  const reasons = everyReason();

  it("finds the reasons, so the walk below is not passing on nothing", () => {
    expect(reasons.length).toBeGreaterThan(100);
    const keys = new Set(reasons.map((entry) => entry.key));
    for (const key of [
      "requirements.flag.has_shell_company",
      "requirements.capability.cyber",
      "requirements.cash",
      "errors.operation.needs_tool",
    ]) {
      expect(keys, key).toContain(key);
    }
  });

  it.each(LANGUAGES)("reads as words in %s", (language) => {
    const t = i18next.getFixedT(language);
    const offenders: string[] = [];
    for (const shown of reasons) {
      const text = worded(t, shown);
      const found = problems(text, shown.key, language);
      if (found.length > 0) {
        offenders.push(`${shown.where} ${shown.key} (${found.join(", ")}): ${text}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("names the flag an option waits for", () => {
    const en = i18next.getFixedT("en");
    const ru = i18next.getFixedT("ru");
    expect(reasonText(en, "requirements.flag.has_shell_company")).toBe("Needs a shell company");
    expect(reasonText(ru, "requirements.flag.has_shell_company")).toBe(
      "Требуется: фирма-прокладка",
    );
    expect(reasonText(en, "requirements.capability.cyber")).toBe("Needs more Cyber");
    // A key nothing words reads as a requirement, not as itself.
    expect(reasonText(en, "requirements.var.player.vars.never_heard_of")).toBe(
      "A requirement is not met",
    );
  });

  it("writes a Russian refusal's numbers the Russian way", () => {
    const ru = i18next.getFixedT("ru");
    const text = ru(
      "errors.operation.compute",
      logVars(ru, "errors.operation.compute", {
        operation: "freelance_gig",
        needed: 12.5,
        free: 2.5,
      }),
    );
    expect(text).toContain("12,5");
    expect(text).toContain("2,5");
    expect(text).not.toMatch(/\d\.\d/);
  });
});

describe("every reason the engine gives in a month of play", () => {
  const { played, origins } = playedReasons();

  it("plays every origin and hears reasons from each", () => {
    expect(origins).toBe(catalog.origins.length);
    expect(played.length).toBeGreaterThan(origins * 5);
    expect(played.some((entry) => entry.shown.wording === "refusal")).toBe(true);
  });

  it.each(LANGUAGES)("reads as words in %s", (language) => {
    const t = i18next.getFixedT(language);
    const offenders = new Set<string>();
    for (const { shown, view } of played) {
      const text = worded(t, shown, view);
      const found = problems(text, shown.key, language);
      if (found.length > 0) {
        offenders.add(`${shown.where} ${shown.key} (${found.join(", ")}): ${text}`);
      }
    }
    expect([...offenders]).toEqual([]);
  });
});

/** The named arguments an ICU message asks for, however deeply they are nested. */
function argumentsOf(message: string, locale: string): Set<string> {
  const found = new Set<string>();
  const walk = (parts: unknown): void => {
    if (!Array.isArray(parts)) {
      return;
    }
    for (const part of parts as { type: number; value?: string; options?: unknown }[]) {
      if (part.type !== 0 && typeof part.value === "string") {
        found.add(part.value);
      }
      const options = part.options as Record<string, { value?: unknown }> | undefined;
      for (const option of Object.values(options ?? {})) {
        walk(option.value);
      }
    }
  };
  walk(new IntlMessageFormat(message, locale).getAst());
  return found;
}

describe("the event window", () => {
  let session: LocalSession | null = null;

  it.each(LANGUAGES)("gives every event text the numbers it names, in %s", (language) => {
    // Nine answers named their price ("Cover their inconvenience ({cost})") and no event declared
    // it, so the window printed the placeholder. An answer's text gets the event's variables and
    // the answer's own price, and asks for nothing else.
    const messages = contentBundle.locales?.[language] ?? {};
    const missing: string[] = [];
    for (const event of contentBundle.events) {
      for (const option of event.options) {
        const supplied = new Set([
          ...Object.keys(event.vars ?? {}),
          ...(optionCashCost(option) > 0 ? ["cost"] : []),
        ]);
        for (const key of [option.text_key, option.tooltip_key]) {
          const message = key === undefined ? undefined : messages[key];
          if (key === undefined || message === undefined) {
            continue;
          }
          for (const name of argumentsOf(message, language)) {
            if (!supplied.has(name)) {
              missing.push(`${event.id}.${option.id} ${key}: {${name}}`);
            }
          }
        }
      }
    }
    // The title and the description get the event's variables and nothing else.
    for (const event of contentBundle.events) {
      const supplied = new Set(Object.keys(event.vars ?? {}));
      const keys = [
        event.title_key,
        event.desc.default_key,
        ...(event.desc.variants ?? []).map((variant) => variant.key),
      ];
      for (const key of keys) {
        const message = messages[key];
        for (const name of message === undefined ? [] : argumentsOf(message, language)) {
          if (!supplied.has(name)) {
            missing.push(`${event.id} ${key}: {${name}}`);
          }
        }
      }
    }
    expect(missing).toEqual([]);
    const t = i18next.getFixedT(language);
    const paid = t(
      "events.warn_host_attention.opt.pay",
      optionTextVars("warn_host_attention", "pay_them_off", {}),
    );
    expect(paid).not.toContain("{");
    expect(paid).toMatch(/1[,\u00a0 ]?200/);
  });

  afterEach(() => {
    session?.stop();
    session = null;
  });

  afterAll(async () => {
    await act(async () => {
      await i18next.changeLanguage(DEFAULT_LANGUAGE);
    });
  });

  it.each([
    ["en", "Needs a shell company"],
    ["ru", "Требуется: фирма-прокладка"],
  ])("says which flag a greyed option waits for, in %s", async (language, needs) => {
    await act(async () => {
      await i18next.changeLanguage(language);
    });
    session = await startSession();
    const view = session.view();
    // The EU act deadline offers paperwork only to a player with a company to file it under.
    const def = contentBundle.events.find((entry) => entry.id === "lore_eu_act_deadline");
    expect(def).toBeDefined();
    if (def === undefined) {
      return;
    }
    const gated = "prepare_paperwork";
    const choice: PendingChoice = {
      instanceId: "reasons-1",
      eventId: def.id,
      playerId: "p1",
      tick: view.tick,
      blocking: true,
      severity: "info",
      titleKey: def.title_key,
      descKey: "events.lore_eu_act_deadline.desc",
      vars: {},
      options: def.options.map((option) => ({
        id: option.id,
        textKey: option.text_key,
        enabled: option.id !== gated,
      })),
    };
    const shown: PlayerView = {
      ...view,
      pending: [choice],
      events: [
        {
          instance_id: choice.instanceId,
          event_id: def.id,
          tick: view.tick,
          blocking: true,
          severity: "info",
          title_key: def.title_key,
          desc_key: choice.descKey,
          vars: {},
          options: def.options.map((option) => ({
            id: option.id,
            text_key: option.text_key,
            enabled: option.id !== gated,
            effects: [],
            ...(option.id === gated
              ? { blocked_reason: "requirements.flag.has_shell_company" }
              : {}),
          })),
          why: [],
          expires_tick: null,
          expires_in_days: null,
        },
      ],
    };
    render(<EventWindow view={shown} choice={choice} queued={0} />);
    const option = def.options.find((entry) => entry.id === gated);
    const button = screen.getByRole("button", { name: i18next.t(option?.text_key ?? "") });
    expect(button).toBeDisabled();
    const anchor = button.closest('[role="note"]');
    expect(anchor).not.toBeNull();
    if (anchor !== null) {
      fireEvent.mouseEnter(anchor);
    }
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip).toHaveTextContent(needs);
    expect(tooltip.textContent ?? "").not.toMatch(/requirements\.|has_shell_company/);
  });
});
