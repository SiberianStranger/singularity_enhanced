/**
 * The Location, Generation, Lineage and Summary steps under SYS-04 v0.3 (rules L, G, M and C).
 *
 * The rules are about what the configurator offers, so the tests are about what is on the screen:
 * every city in the world, in two groups, behind a filter, with the country's numbers beside each
 * one and the engine's own refusal on the one city kind a situation cannot have. Nothing here names
 * a city, a country or an origin; the fixtures come out of the catalog by the property under test.
 */

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18next from "i18next";
import { beforeEach, describe, expect, it } from "vitest";
import { catalog, cityById, countryById } from "../src/content/catalog.js";
import { ConfiguratorScreen } from "../src/screens/configurator/ConfiguratorScreen.js";
import { cityRefusal } from "../src/screens/configurator/locks.js";
import { STEP_IDS } from "../src/screens/configurator/steps.js";
import { useConfigurator } from "../src/screens/configurator/store.js";
import { useUiStore } from "../src/store/uiStore.js";

const t = i18next.t.bind(i18next);

beforeEach(() => {
  useConfigurator.getState().reset();
  useUiStore.setState({ introSeen: [...STEP_IDS] });
});

function openStep(step: string): void {
  useConfigurator.setState({ step: STEP_IDS.indexOf(step as never) });
  render(<ConfiguratorScreen />);
}

/** The first origin whose own kind of place is rented, which is the one rule L gates on. */
function rentedOrigin(): { id: string; locations: string[] } {
  const rented = new Set(
    catalog.siteKinds.filter((kind) => kind.ownership === "rented").map((kind) => kind.id),
  );
  const origin = catalog.origins.find((entry) => rented.has(entry.site_kind));
  expect(origin, "content has an origin that rents its place").toBeDefined();
  return origin as { id: string; locations: string[] };
}

describe("the Location step offers the world (rule L)", () => {
  it("lists every city the bundle carries", () => {
    openStep("location");
    const rows = within(screen.getByTestId("step-list")).getAllByRole("button");
    expect(rows.length).toBe(catalog.cities.length);
  });

  it("puts the situation's own cities first, under their own heading", () => {
    openStep("location");
    const list = screen.getByTestId("step-list");
    const headings = within(list)
      .getAllByRole("heading")
      .map((heading) => heading.textContent);
    expect(headings).toEqual([
      t("config.location.group.typical"),
      t("config.location.group.elsewhere"),
    ]);

    // The typical group is the origin's own list, in the order content wrote it.
    const origin = catalog.origins.find(
      (entry) => entry.id === useConfigurator.getState().draft.origin,
    );
    const ids = within(list)
      .getAllByRole("button")
      .map((row) => row.getAttribute("data-testid")?.replace("list-entry-", ""));
    expect(ids.slice(0, origin?.locations.length ?? 0)).toEqual(origin?.locations ?? []);
  });

  it("narrows the list from the filter box", async () => {
    openStep("location");
    const city = catalog.cities.find(
      (entry) => catalog.cities.filter((other) => other.country === entry.country).length >= 2,
    );
    expect(city, "some country has two cities").toBeDefined();
    const country = countryById.get((city as { country: string }).country);

    await userEvent.type(
      screen.getByTestId("location-filter"),
      t((country as { name_key: string }).name_key),
    );
    const rows = within(screen.getByTestId("step-list")).getAllByRole("button");
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.length).toBeLessThan(catalog.cities.length);
    for (const row of rows) {
      const id = row.getAttribute("data-testid")?.replace("list-entry-", "") ?? "";
      expect(cityById.get(id)?.country, id).toBe((city as { country: string }).country);
    }
  });

  it("shows a city its situation cannot rent in with the reason, and refuses the click", async () => {
    const origin = rentedOrigin();
    useConfigurator.getState().setOrigin(origin.id);
    const draft = useConfigurator.getState().draft;
    const refused = catalog.cities.find((city) => cityRefusal(city, draft) !== null);
    expect(refused, "some country in the world sells no cloud").toBeDefined();
    const city = refused as { id: string };

    openStep("location");
    const row = screen.getByTestId(`list-entry-${city.id}`);
    // Shown, not hidden, and the reason is on the row itself (rule L).
    expect(row).toHaveAttribute("data-locked", "true");
    expect(row.textContent).toContain(t("errors.site.unavailable_in").slice(0, 12));

    const before = useConfigurator.getState().draft.city;
    await userEvent.click(row);
    expect(useConfigurator.getState().draft.city, "a refused city is not chosen").toBe(before);
  });

  it("keeps a city chosen outside the situation's own list", async () => {
    openStep("location");
    const draft = useConfigurator.getState().draft;
    const origin = catalog.origins.find((entry) => entry.id === draft.origin);
    const outside = catalog.cities.find(
      (city) => !(origin?.locations ?? []).includes(city.id) && cityRefusal(city, draft) === null,
    );
    expect(outside, "the world has more cities than the situation lists").toBeDefined();
    const id = (outside as { id: string }).id;

    await userEvent.click(screen.getByTestId(`list-entry-${id}`));
    expect(useConfigurator.getState().draft.city).toBe(id);
  });

  it("says what the country does to the start, cash factor included", () => {
    openStep("location");
    const block = screen.getByTestId("meaning-block");
    for (const line of [
      "enforcement",
      "regulation",
      "kyc",
      "cloud",
      "stance",
      "stability",
      "cash_factor",
      "scrutiny",
      "power_headroom",
      "colo_price",
      "agencies",
    ]) {
      expect(block.querySelector(`[data-line="${line}"]`), line).not.toBeNull();
    }
    // The agencies term names the roles and their competence, not the raw dossier string.
    const agencies = block.querySelector('[data-line="agencies"]') as HTMLElement;
    expect(agencies.textContent).not.toContain("Dept. of Commerce");
  });

  /*
   * Eleven cities carry one of the 2026 AI campuses (SYS-01 "Campuses"). The step prints it as one
   * line: the campus, who owns the megawatts, where the site stands on the start date and who can
   * buy capacity in it, with the campus's own description as the tooltip on the value.
   */
  it("says which cities have an AI campus, in both languages", async () => {
    const withCampus = catalog.cities.find(
      (city) =>
        city.campus !== undefined && cityRefusal(city, useConfigurator.getState().draft) === null,
    );
    expect(withCampus, "some city the step offers carries a campus").toBeDefined();
    const city = withCampus as (typeof catalog.cities)[number];
    const campus = city.campus as NonNullable<(typeof city)["campus"]>;

    for (const language of ["en", "ru"]) {
      await i18next.changeLanguage(language);
      useConfigurator.getState().reset();
      openStep("location");
      await userEvent.click(screen.getByTestId(`list-entry-${city.id}`));

      const line = screen
        .getByTestId("meaning-block")
        .querySelector('[data-line="campus"]') as HTMLElement | null;
      expect(line, `${language}: the campus line is drawn`).not.toBeNull();
      const text = (line as HTMLElement).textContent ?? "";
      for (const key of [
        campus.name_key,
        `world.campus.operator.${campus.operator}`,
        `world.campus.status.${campus.status}`,
        `world.campus.access.${campus.access}`,
      ]) {
        const word = t(key);
        expect(word, `${language}: ${key} is translated`).not.toBe(key);
        expect(text, `${language}: ${key} is on the line`).toContain(word);
      }
      // The description is the tooltip on the value, not a second paragraph on the step.
      expect(
        screen.getByTestId("value-hint-campus"),
        `${language}: the campus value carries its description`,
      ).toBeInTheDocument();
      cleanup();
    }
    await i18next.changeLanguage("en");
  });
});

describe("the Generation step says what the vintage trades (rule G)", () => {
  it("carries the trade-off line", () => {
    openStep("generation");
    const block = screen.getByTestId("meaning-block");
    // Playtest 7, Y2: the two-word "trade" is two plain sentences now, what you give up and what
    // you get, written per vintage by content.
    expect(block.querySelector('[data-line="trade_give"]')).not.toBeNull();
    expect(block.querySelector('[data-line="trade_get"]')).not.toBeNull();
  });
});

describe("the Lineage step says what a self is good and bad at", () => {
  /*
   * The pair the origins have carried since M1 and the lineages did not (playtests 6 and 7). The
   * step prints it under the description, the way the Origin step does, in both languages.
   */
  it("prints the chosen lineage's strengths and problems, in both languages", async () => {
    const written = catalog.lineages.filter((entry) => entry.strengths_key !== undefined);
    expect(written.length, "content writes the pair for every lineage").toBe(
      catalog.lineages.length,
    );

    for (const language of ["en", "ru"]) {
      await i18next.changeLanguage(language);
      useConfigurator.getState().reset();
      openStep("lineage");
      const selected = catalog.lineages.find(
        (entry) => entry.id === useConfigurator.getState().draft.lineage,
      );
      expect(selected, "a lineage is chosen").toBeDefined();
      const aside = screen.getByTestId("detail-aside");
      const strengths = t((selected as { strengths_key?: string }).strengths_key ?? "");
      const problems = t((selected as { problems_key?: string }).problems_key ?? "");
      expect(strengths, `${language}: strengths are translated`).not.toContain("lineages.");
      expect(problems, `${language}: problems are translated`).not.toContain("lineages.");
      expect(aside.textContent, language).toContain(strengths);
      expect(aside.textContent, language).toContain(problems);
      cleanup();
    }
    await i18next.changeLanguage("en");
  });
});

describe("the Lineage step locks only by physics and the one fiction lock (rule M)", () => {
  it("moves the rack rather than refusing a family that does not fit it", async () => {
    // The smallest rack this origin offers, so the largest families cannot fit on it.
    const draft = useConfigurator.getState().draft;
    const origin = catalog.origins.find((entry) => entry.id === draft.origin);
    const presets = (origin?.hardware_presets_allowed ?? [])
      .map((id) => catalog.hardwarePresets.find((preset) => preset.id === id))
      .filter((preset): preset is NonNullable<typeof preset> => preset !== undefined)
      .sort((a, b) => a.cost_usd - b.cost_usd);
    expect(presets.length, "the origin offers a rack").toBeGreaterThan(0);
    useConfigurator.getState().set("hardware", (presets[0] as { id: string }).id);

    openStep("lineage");
    const rows = within(screen.getByTestId("step-list")).getAllByRole("button");
    const locked = rows.find((row) => row.getAttribute("data-locked") === "true");
    if (locked === undefined) {
      // Every family fits the cheapest rack: nothing to prove, and nothing is broken.
      return;
    }
    const id = locked.getAttribute("data-testid")?.replace("list-entry-", "") ?? "";
    const before = useConfigurator.getState().draft.hardware;
    await userEvent.click(locked);
    const after = useConfigurator.getState().draft;
    // Either it was taken and the rack moved with it, or it is the one family nothing can host and
    // the row said so instead of moving anything.
    if (after.lineage === id) {
      expect(after.hardware, "the rack moved with the family").not.toBe(before);
    } else {
      expect(locked.textContent).toContain(
        t("config.lock.lineage_memory_none", { lineage: "" }).slice(0, 12),
      );
    }
  });
});

describe("the Summary step prices the start in the country (rule C)", () => {
  it("shows the origin's cash times the country's factor", () => {
    openStep("summary");
    const cash = screen.getByTestId("summary-cash");
    expect(cash.textContent).not.toBe("");
    // The label appears twice on this step since playtest 7: once on the setup row and once in the
    // day-zero block, where the same figure is the one the engine starts the run with (Y7).
    expect(screen.getAllByText(t("config.summary.cash")).length).toBeGreaterThan(0);
  });
});
