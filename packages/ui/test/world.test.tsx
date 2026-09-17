/**
 * The M2 world in the client: the ledger, the country and city panels, and the identities section
 * (SYS-01 "M2 contract", SYS-11 "Layout").
 *
 * Everything runs against the real simulation core through `LocalHost`, so what a test renders is
 * what the build renders and the figures are the ones the engine published. Nothing here names a
 * country, a city or a watcher: the fixtures are found in the view by the property under test (the
 * country the run starts in, the first city whose providers carry a refusal), so retuning content
 * moves the tests with it instead of breaking them.
 */

import type { PlayerView } from "@singularity/core";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18next from "i18next";
import { afterEach, describe, expect, it } from "vitest";
import { catalog } from "../src/content/catalog.js";
import { agencyName, refusalText } from "../src/lib/labels.js";
import { CITY_TABS, CityPanel } from "../src/screens/game/selection/CityPanel.js";
import { COUNTRY_TABS, CountryPanel } from "../src/screens/game/selection/CountryPanel.js";
import { FinancesTab } from "../src/screens/game/tabs/FinancesTab.js";
import { WorldLedger } from "../src/screens/game/tabs/WorldTab.js";
import { useUiStore } from "../src/store/uiStore.js";
import { type LocalSession, startSession } from "./helpers.js";

const t = i18next.t.bind(i18next);

/**
 * A dotted lowercase token is what an unresolved `t("world.col.kyc")` leaves on the screen.
 *
 * Every segment after a dot has to start with a letter, because `textContent` glues a label to its
 * value with no space and "Starting cash here" beside "1.00x" would otherwise read as a key.
 */
const RAW_KEY = /(^|\s)[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*){1,4}(\s|$)/;

let session: LocalSession | null = null;

afterEach(() => {
  session?.stop();
  session = null;
  useUiStore.setState({ selection: null, mapMode: "presence", primaryTab: "overview" });
});

async function play(): Promise<PlayerView> {
  session = await startSession();
  return session.view();
}

/** The country the run woke up in: the one the player is certainly present in. */
function homeCountry(view: PlayerView): string {
  const home = view.countries.find((country) => country.presence);
  expect(home, "the run starts somewhere").toBeDefined();
  return (home as { id: string }).id;
}

describe("the world ledger", () => {
  it("has a page for the countries, the map modes and the world's own figures", async () => {
    const view = await play();
    render(<WorldLedger view={view} />);

    for (const tab of ["countries", "map_modes", "world"]) {
      expect(screen.getByTestId(`ledger-tab-${tab}`)).toBeInTheDocument();
    }
    // The countries page is the one it opens on.
    expect(screen.getByTestId("ledger-tab-countries")).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("table", { name: t("world.countries") })).toBeInTheDocument();
  });

  it("switches the column families and keeps every column of the contract reachable", async () => {
    const view = await play();
    render(<WorldLedger view={view} />);

    const headersNow = (): string[] =>
      screen.getAllByRole("columnheader").map((header) => header.textContent ?? "");

    expect(headersNow().join("|")).toContain(t("world.col.stance"));
    await userEvent.click(screen.getByTestId("column-set-economy"));
    const economy = headersNow().join("|");
    for (const key of [
      "power_price",
      "cloud",
      "colo",
      "hardware",
      "chips",
      "kyc",
      "market",
      "cash",
    ]) {
      expect(economy, key).toContain(t(`world.col.${key}`));
    }

    await userEvent.click(screen.getByTestId("column-set-presence"));
    const presence = headersNow().join("|");
    for (const key of ["sites", "identities", "watchers", "cases", "incidents", "heat"]) {
      expect(presence, key).toContain(t(`world.col.${key}`));
    }
    // The country and "am I here" stay put whichever family is shown.
    expect(presence).toContain(t("world.col.country"));
    expect(presence).toContain(t("world.col.presence"));
  });

  it("sorts by the column the player picks and keeps it across a column change", async () => {
    const view = await play();
    render(<WorldLedger view={view} />);

    // The header cell holds two controls: the sort button and the map-mode button beside it.
    const cell = (): HTMLElement =>
      screen.getByRole("columnheader", { name: new RegExp(t("world.col.awareness")) });
    const sortButton = (): HTMLElement => within(cell()).getAllByRole("button")[0] as HTMLElement;

    await userEvent.click(sortButton());
    expect(cell()).toHaveAttribute("aria-sort", "ascending");
    await userEvent.click(sortButton());
    expect(cell()).toHaveAttribute("aria-sort", "descending");
    expect(sortButton().className).toContain("underline");

    // A sort the player chose survives a change of column family, which a table holding its own
    // sort state cannot do.
    await userEvent.click(screen.getByTestId("column-set-economy"));
    await userEvent.click(screen.getByTestId("column-set-politics"));
    expect(cell()).toHaveAttribute("aria-sort", "descending");
  });

  it("filters by macro-region and by presence", async () => {
    const view = await play();
    render(<WorldLedger view={view} />);
    const rows = (): number => screen.getAllByRole("row").length - 1;
    const all = rows();
    expect(all).toBe(view.countries.length);

    await userEvent.selectOptions(screen.getByLabelText(t("world.filter.show")), "presence");
    const present = rows();
    expect(present).toBe(view.countries.filter((country) => country.presence).length);
    expect(present).toBeLessThan(all);

    await userEvent.selectOptions(screen.getByLabelText(t("world.filter.show")), "all");
    const region = view.countries[0]?.macro_region as string;
    await userEvent.selectOptions(screen.getByLabelText(t("world.filter.region")), region);
    expect(rows()).toBe(view.countries.filter((country) => country.macro_region === region).length);
  });

  it("paints the map from the button beside a numeric column", async () => {
    const view = await play();
    render(<WorldLedger view={view} />);
    expect(useUiStore.getState().mapMode).toBe("presence");

    await userEvent.click(screen.getByTestId("map-mode-enforcement"));
    expect(useUiStore.getState().mapMode).toBe("enforcement");

    // Including the two categorical ones, which the map draws from a table of hues with a legend.
    await userEvent.click(screen.getByTestId("map-mode-stance"));
    expect(useUiStore.getState().mapMode).toBe("stance");
    await userEvent.click(screen.getByTestId("column-set-economy"));
    await userEvent.click(screen.getByTestId("map-mode-power_price"));
    expect(useUiStore.getState().mapMode).toBe("power_price");
  });

  it("selects the country a row names", async () => {
    const view = await play();
    render(<WorldLedger view={view} />);
    const home = homeCountry(view);
    const row = screen.getByRole("table", { name: t("world.countries") }).querySelector("tbody tr");
    expect(row).not.toBeNull();
    await userEvent.click(row as HTMLElement);
    expect(useUiStore.getState().selection?.kind).toBe("country");
    // And the home country is one of the rows, so the ledger is a way to reach it.
    expect(view.countries.some((country) => country.id === home)).toBe(true);
  });

  it("prints the world's own figures with the exposed thresholds", async () => {
    const view = await play();
    render(<WorldLedger view={view} />);
    await userEvent.click(screen.getByTestId("ledger-tab-world"));

    for (const key of [
      "world.awareness_global",
      "world.awareness_presence",
      "world.hunt_level",
      "world.hunt_pressure",
      "world.ai_adoption",
      "world.gpu_price_index",
      "world.cloud_demand_index",
    ]) {
      expect(screen.getAllByText(t(key)).length, key).toBeGreaterThan(0);
    }
  });
});

describe("the country panel", () => {
  it("renders every tab from a real view, with no raw key and no empty value", async () => {
    const view = await play();
    const home = homeCountry(view);

    for (const tab of COUNTRY_TABS) {
      const { unmount } = render(<CountryPanel view={view} id={home} tab={tab} />);
      const text = document.body.textContent ?? "";
      expect(text.trim(), tab).not.toBe("");
      expect(text, tab).not.toMatch(RAW_KEY);
      // No parameter row printed with nothing after its label.
      expect(text, tab).not.toMatch(/:\s*$/);
      unmount();
    }
  });

  it("shows the stance, the government and the four dynamics on the overview", async () => {
    const view = await play();
    const home = homeCountry(view);
    const row = view.countries.find((country) => country.id === home) as { stance: string };
    render(<CountryPanel view={view} id={home} tab="overview" />);

    expect(screen.getByText(t(`world.stance.${row.stance}.name`))).toBeInTheDocument();
    for (const key of [
      "world.awareness",
      "world.opinion",
      "world.regulation",
      "world.enforcement",
    ]) {
      expect(screen.getAllByText(t(key)).length, key).toBeGreaterThan(0);
    }
  });

  it("lists the watchers of a country the player is present in", async () => {
    const view = await play();
    const watched = view.countries.find((country) => country.watchers.length > 0);
    expect(watched, "the run starts watched somewhere").toBeDefined();
    const id = (watched as { id: string }).id;
    render(<CountryPanel view={view} id={id} tab="watchers" />);

    const roles = view.detection.watchers
      .filter((watcher) => watcher.country === id)
      .map((watcher) => t(`detection.role.${watcher.role}`));
    expect(roles.length).toBeGreaterThan(0);
    for (const role of roles) {
      expect(screen.getAllByText(new RegExp(role)).length, role).toBeGreaterThan(0);
    }
    expect(screen.getAllByText(t("detection.competence")).length).toBe(roles.length);
  });

  it("names a country's agencies from the content locales, in both languages", async () => {
    // M2 second pass: the world data carries no display strings at all, so the name a panel prints
    // is `world.country.<id>.agency.<role>` and a Russian dossier reads Russian institutions.
    const view = await play();
    const watched = view.countries.find((country) => country.watchers.length > 0);
    expect(watched, "the run starts watched somewhere").toBeDefined();
    const id = (watched as { id: string }).id;
    const roles = view.detection.watchers
      .filter((watcher) => watcher.country === id)
      .map((watcher) => watcher.role);
    expect(roles.length).toBeGreaterThan(0);

    const english = roles.map((role) => agencyName(t, id, role));
    expect(english.every((name) => name !== undefined && name !== "")).toBe(true);
    await i18next.changeLanguage("ru");
    try {
      const russian = roles.map((role) => agencyName(t, id, role));
      expect(russian.every((name) => name !== undefined && name !== "")).toBe(true);
      // At least one of them is genuinely translated rather than the English string coming back.
      expect(russian.some((name, index) => name !== english[index])).toBe(true);
      expect(russian.some((name) => /[\u0400-\u04ff]/.test(name ?? ""))).toBe(true);
    } finally {
      await i18next.changeLanguage("en");
    }
  });

  it("opens a city from the country's Cities tab", async () => {
    const view = await play();
    const home = homeCountry(view);
    const city = view.cities.find((entry) => entry.country === home);
    expect(city, "the home country has a city").toBeDefined();
    render(<CountryPanel view={view} id={home} tab="cities" />);

    await userEvent.click(screen.getByTestId(`country-city-${(city as { id: string }).id}`));
    expect(useUiStore.getState().selection).toEqual({
      kind: "city",
      id: (city as { id: string }).id,
    });
  });
});

describe("the city panel", () => {
  it("renders every tab from a real view, with no raw key and no empty value", async () => {
    const view = await play();
    const home = view.sites[0]?.city as string;
    expect(home, "the run starts in a city").toBeDefined();

    for (const tab of CITY_TABS) {
      const { unmount } = render(<CityPanel view={view} id={home} tab={tab} />);
      const text = document.body.textContent ?? "";
      expect(text.trim(), tab).not.toBe("");
      expect(text, tab).not.toMatch(RAW_KEY);
      unmount();
    }
  });

  /*
   * The eleven cities that carry one of the 2026 AI campuses (SYS-01 "Campuses"). What matters
   * about one is the access rule, so the panel prints the operator, the status and the access as
   * three rows, and all three are words in both languages rather than the enum the data carries.
   */
  it("says what the city's campus is, in both languages", async () => {
    const view = await play();
    const withCampus = catalog.cities.find((city) => city.campus !== undefined);
    expect(withCampus, "some city in the world carries a campus").toBeDefined();
    const city = withCampus as (typeof catalog.cities)[number];
    const campus = city.campus as NonNullable<(typeof city)["campus"]>;

    for (const language of ["en", "ru"]) {
      await i18next.changeLanguage(language);
      const { unmount } = render(<CityPanel view={view} id={city.id} tab="overview" />);
      const text = document.body.textContent ?? "";
      expect(text, `${language}: the campus is named`).toContain(t(campus.name_key));
      for (const key of [
        `world.campus.operator.${campus.operator}`,
        `world.campus.status.${campus.status}`,
        `world.campus.access.${campus.access}`,
      ]) {
        const word = t(key);
        expect(word, `${language}: ${key} is translated`).not.toBe(key);
        expect(text, `${language}: ${key} is on screen`).toContain(word);
      }
      expect(text, language).not.toMatch(RAW_KEY);
      unmount();
    }
    await i18next.changeLanguage("en");
  });

  it("greys a provider that cannot be had here and prints the engine's own reason", async () => {
    const view = await play();
    const blocked = view.cities.find((city) =>
      city.site_kinds.some((entry) => entry.blocked_reason !== null),
    );
    expect(blocked, "some city in the world cannot host some kind of place").toBeDefined();
    const city = blocked as (typeof view.cities)[number];
    render(<CityPanel view={view} id={city.id} tab="providers" />);

    for (const entry of city.site_kinds) {
      const row = screen.getByTestId(`provider-${entry.kind}`);
      if (entry.blocked_reason === null) {
        expect(row).not.toHaveAttribute("data-blocked");
        continue;
      }
      expect(row).toHaveAttribute("data-blocked", "true");
      // The same key the command refuses with, so the row and the refusal cannot drift apart.
      expect(row.textContent, entry.kind).toContain(refusalText(t, entry.blocked_reason));
    }
  });

  it("jumps from a site here to the compute panel", async () => {
    const view = await play();
    const site = view.sites[0];
    expect(site, "the run starts with a site").toBeDefined();
    render(<CityPanel view={view} id={(site as { city: string }).city} tab="sites" />);

    await userEvent.click(screen.getByTestId(`city-site-${(site as { id: string }).id}`));
    expect(useUiStore.getState().primaryTab).toBe("compute");
    expect(useUiStore.getState().selection).toEqual({
      kind: "site",
      id: (site as { id: string }).id,
    });
  });
});

describe("the names the player trades under", () => {
  it("has a section in Finances that says what state each name is in", async () => {
    const view = await play();
    render(<FinancesTab view={view} />);
    const section = screen.getByTestId("identities");
    expect(within(section).getByText(t("finances.identities"))).toBeInTheDocument();

    if (view.finances.identities.length === 0) {
      // A run with no name yet says so rather than showing an empty frame.
      expect(within(section).getByText(t("finances.identities_empty"))).toBeInTheDocument();
      return;
    }
    for (const identity of view.finances.identities) {
      expect(
        within(section).getByTestId(`identity-status-${identity.id}`).textContent,
        identity.id,
      ).toBe(t(`finances.identity.status.${identity.status}`));
    }
  });

  it("puts the country factor behind the market depth", async () => {
    const view = await play();
    render(<FinancesTab view={view} />);
    // The depth line is the trigger; the terms live in its tooltip, which is what the country
    // factor is a term of (SYS-01 M2 contract "Money").
    const depth = screen.getByTestId("market-depth");
    expect(depth.textContent).not.toBe("");
    await userEvent.hover(depth);
    const tip = await screen.findByRole("tooltip");
    expect(tip.textContent).toContain(t("world.market_factor_hint").slice(0, 24));
  });
});
