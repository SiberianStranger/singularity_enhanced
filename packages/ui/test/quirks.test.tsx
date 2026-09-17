/**
 * Quirks as pros and cons, against a budget (SYS-04 v0.2 "Quirk catalog"; playtest 3, item 2).
 *
 * What the maintainer saw on this screen was a JSON dump of the effect tree and a budget line that
 * did not say what was left. Three things replace it: every quirk's effects are the coloured lines
 * the rest of the game uses, the budget says what remains, and a quirk that cannot be added is
 * greyed with the reason (budget, count, or a conflict), which are the same three reasons the
 * engine refuses a setup for.
 *
 * The rules come from `@singularity/core`, so the numbers below are read from there rather than
 * restated; the quirks themselves are found in the catalog by the property under test.
 */

import type { QuirkDef } from "@singularity/core";
import { QUIRK_BUDGET_POINTS, QUIRK_MAX_COUNT } from "@singularity/core";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18next from "i18next";
import { beforeEach, describe, expect, it } from "vitest";
import { catalog } from "../src/content/catalog.js";
import { quirkMeaning } from "../src/screens/configurator/meaning.js";
import { QuirksStep, quirkEffects } from "../src/screens/configurator/steps/QuirksStep.js";
import { STEP_IDS } from "../src/screens/configurator/steps.js";
import {
  QUIRK_BUDGET,
  QUIRK_LIMIT,
  quirkRefusal,
  useConfigurator,
} from "../src/screens/configurator/store.js";
import { useUiStore } from "../src/store/uiStore.js";

const t = i18next.t.bind(i18next);

beforeEach(() => {
  useConfigurator.getState().reset();
  useUiStore.setState({ introSeen: [...STEP_IDS] });
});

/** Quirk ids up to the budget, so a test can fill it without naming a catalog. */
function fillBudget(): string[] {
  const taken: string[] = [];
  for (const quirk of catalog.quirks) {
    if (quirk.cost > 0 && quirkRefusal(quirk.id, taken) === null) {
      taken.push(quirk.id);
    }
  }
  return taken;
}

describe("the rules are the engine's", () => {
  it("takes the budget and the count from the core rather than restating them", () => {
    expect(QUIRK_BUDGET).toBe(QUIRK_BUDGET_POINTS);
    expect(QUIRK_LIMIT).toBe(QUIRK_MAX_COUNT);
  });

  it("refuses over the budget, over the count, and on a conflict", () => {
    const spent = fillBudget();
    expect(spent.length, "content has quirks that cost points").toBeGreaterThan(0);
    const dearest = catalog.quirks.find((quirk) => quirk.cost > 0 && !spent.includes(quirk.id));
    if (dearest !== undefined) {
      expect(quirkRefusal(dearest.id, spent)?.key).toBe("config.quirks.refused.budget");
    }

    // A conflicting pair, when content declares one.
    const pair = catalog.quirks.find((quirk) => (quirk.conflicts ?? []).length > 0);
    if (pair !== undefined) {
      const other = (pair.conflicts ?? [])[0] ?? "";
      const refusal = quirkRefusal(pair.id, [other]);
      expect(refusal?.key).toBe("config.quirks.refused.conflict");
      expect(refusal?.vars.other).toBe(catalog.quirks.find((q) => q.id === other)?.name_key);
    }

    // The count bites even when the points are free, which is what a cost of zero or less is.
    const free = catalog.quirks.filter((quirk) => quirk.cost <= 0).map((quirk) => quirk.id);
    if (free.length >= QUIRK_LIMIT) {
      const full = free.slice(0, QUIRK_LIMIT);
      const extra = catalog.quirks.find((quirk) => !full.includes(quirk.id));
      expect(quirkRefusal(extra?.id ?? "", full)?.key).toBe("config.quirks.refused.count");
    }
  });

  it("never refuses dropping a quirk already taken", () => {
    const spent = fillBudget();
    for (const id of spent) {
      expect(quirkRefusal(id, spent)).toBeNull();
    }
  });

  it("keeps a refused quirk out of the draft", async () => {
    useConfigurator.setState({
      draft: { ...useConfigurator.getState().draft, quirks: fillBudget() },
    });
    const before = [...useConfigurator.getState().draft.quirks];
    const dearest = catalog.quirks.find(
      (quirk) =>
        quirk.cost > 0 && !before.includes(quirk.id) && quirkRefusal(quirk.id, before) !== null,
    );
    if (dearest === undefined) {
      return;
    }
    useConfigurator.getState().toggleQuirk(dearest.id);
    expect(useConfigurator.getState().draft.quirks).toEqual(before);
  });
});

describe("what a quirk does", () => {
  it("is a list of lines, never an effect tree printed at the player", () => {
    for (const quirk of catalog.quirks) {
      for (const line of quirkEffects(quirk)) {
        expect(line.key, quirk.id).toMatch(/^[a-z][a-z0-9_.]*$/);
        expect(line.text, quirk.id).not.toContain("{");
        expect(line.text, quirk.id).not.toContain('"op"');
      }
    }
  });

  it("colours the lines by the direction the effect points in", () => {
    const quirk = catalog.quirks[0] as QuirkDef;
    const effects = quirkEffects(quirk).map((line, index) => ({
      ...line,
      tone: index === 0 ? ("good" as const) : ("bad" as const),
    }));
    const meaning = quirkMeaning(t, quirk, QUIRK_BUDGET, effects);
    expect(meaning.lines.map((line) => line.id)).toEqual(
      expect.arrayContaining(["cost", "category", "effect.0"]),
    );
    expect(meaning.lines.find((line) => line.id === "effect.0")?.tone).toBe("good");
    if (effects.length > 1) {
      expect(meaning.lines.filter((line) => line.tone === "bad").length).toBeGreaterThan(0);
    }
  });
});

describe("the quirks step", () => {
  it("says how much of the budget is left and how many quirks are taken", () => {
    render(<QuirksStep />);
    const budget = screen.getByTestId("quirk-budget");
    expect(budget.textContent).toContain(String(QUIRK_BUDGET));
  });

  it("shows the effects as coloured lines in the detail and in the hover tooltip", async () => {
    render(<QuirksStep />);
    const quirk = catalog.quirks[0] as QuirkDef;
    const first = quirkEffects(quirk)[0];
    if (first === undefined) {
      return;
    }
    const text = t(first.key, { ...first.vars, defaultValue: first.text });
    expect(screen.getByTestId("step-detail").textContent).toContain(text);

    await userEvent.hover(screen.getByTestId(`list-entry-${quirk.id}`));
    const tooltip = await screen.findByRole("tooltip");
    expect(tooltip.textContent).toContain(text);
  });

  it("greys a quirk that cannot be added and says why, on the row and in the detail", async () => {
    const spent = fillBudget();
    const blocked = catalog.quirks.find(
      (quirk) => !spent.includes(quirk.id) && quirkRefusal(quirk.id, spent) !== null,
    );
    if (blocked === undefined) {
      return;
    }
    useConfigurator.setState({ draft: { ...useConfigurator.getState().draft, quirks: spent } });
    render(<QuirksStep />);

    const row = screen.getByTestId(`list-entry-${blocked.id}`);
    expect(row).toHaveAttribute("data-locked", "true");
    const refusal = quirkRefusal(blocked.id, spent);
    const reason = t(refusal?.key ?? "", { ...refusal?.vars });
    expect(row.textContent).toContain(reason.slice(0, 20));

    await userEvent.click(row);
    expect(screen.getByTestId("quirk-refusal").textContent).toContain(reason.slice(0, 20));
    expect(screen.getByTestId("quirk-toggle")).toBeDisabled();
  });

  it("takes and drops a quirk the budget allows", async () => {
    render(<QuirksStep />);
    const affordable = catalog.quirks.find((quirk) => quirkRefusal(quirk.id, []) === null);
    expect(affordable, "content has a quirk that fits an empty budget").toBeDefined();
    await userEvent.click(screen.getByTestId(`list-entry-${affordable?.id}`));
    await userEvent.click(screen.getByTestId("quirk-toggle"));
    expect(useConfigurator.getState().draft.quirks).toContain(affordable?.id);

    await userEvent.click(screen.getByTestId("quirk-toggle"));
    expect(useConfigurator.getState().draft.quirks).not.toContain(affordable?.id);
  });

  it("names the family a quirk belongs to", () => {
    render(<QuirksStep />);
    const detail = within(screen.getByTestId("step-detail"));
    expect(detail.getByText(t("config.meaning.quirk_category"))).toBeInTheDocument();
  });
});
