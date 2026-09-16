/**
 * The panels the first playtest said did not explain themselves, against the real core.
 *
 * Each test is one of the findings: the hardware list is a table with prices (U1), research
 * defaults to what can be started (U2), settings left the panel tabs for the menu (U5), building a
 * site compares the kinds (C4), the precision table shows the trade-off (C3), decisions and event
 * options list their effects (C8, C9), the finances panel says where money comes from and what the
 * market will take (C6), and a refused command says why (C7).
 */

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18next from "i18next";
import { afterEach, describe, expect, it } from "vitest";
import { logVars } from "../src/lib/labels.js";
import { refusalOf } from "../src/lib/viewContract.js";
import { GameScreen } from "../src/screens/game/GameScreen.js";
import { useGameStore } from "../src/store/gameStore.js";
import { useUiStore } from "../src/store/uiStore.js";
import { type LocalSession, startSession } from "./helpers.js";

// Toasts and alerts name their variables the way the log does (playtest 5, L10).
const tr = i18next.t.bind(i18next);

let session: LocalSession | null = null;

afterEach(() => {
  session?.stop();
  session = null;
  useUiStore.setState({ menuSection: null, notices: [], selection: null, primaryTab: "overview" });
});

/** A started game with the opening events answered, which is where a player actually plays from. */
async function play(): Promise<LocalSession> {
  session = await startSession();
  render(<GameScreen />);
  for (const choice of session.view().pending.filter((entry) => entry.blocking)) {
    const option = choice.options.find((entry) => entry.enabled);
    if (option !== undefined) {
      await useGameStore
        .getState()
        .send({ type: "resolve_event", instanceId: choice.instanceId, optionId: option.id });
    }
  }
  return session;
}

function panel(): HTMLElement {
  return screen.getByRole("tab", { selected: true }).closest("section") as HTMLElement;
}

async function openTab(name: RegExp): Promise<HTMLElement> {
  await userEvent.click(screen.getByRole("tab", { name }));
  return panel();
}

describe("settings live in the menu (U5)", () => {
  it("has no settings tabs in the game panel", async () => {
    await play();
    expect(screen.queryByRole("tab", { name: "Settings" })).toBeNull();
    expect(screen.queryByRole("tab", { name: "Message settings" })).toBeNull();
  });

  it("opens settings and message settings from the Menu button", async () => {
    await play();
    await userEvent.click(screen.getByRole("button", { name: "Menu" }));
    const menu = await screen.findByRole("dialog");
    expect(within(menu).getByRole("button", { name: "Settings" })).toBeInTheDocument();

    await userEvent.click(within(menu).getByRole("button", { name: "Message settings" }));
    expect(useUiStore.getState().menuSection).toBe("messages");
    expect(await screen.findByRole("button", { name: "Verbose" })).toBeInTheDocument();
  });

  it("offers a new game and quitting alongside save and load", async () => {
    await play();
    await userEvent.click(screen.getByRole("button", { name: "Menu" }));
    const menu = await screen.findByRole("dialog");
    for (const name of ["Save game", "Load game", "New game", "Quit to main menu"]) {
      expect(within(menu).getByRole("button", { name })).toBeInTheDocument();
    }
  });

  it("carries the map style and the interface font", async () => {
    await play();
    useUiStore.getState().openMenu("settings");
    const menu = await screen.findByRole("dialog");
    await userEvent.click(within(menu).getByRole("radio", { name: "Vector" }));
    expect(useUiStore.getState().mapStyle).toBe("vector");
    await userEvent.click(within(menu).getByRole("radio", { name: "Plain" }));
    expect(useUiStore.getState().fontFace).toBe("plain");
  });
});

describe("research (U2, C5)", () => {
  it("shows what can be started, not every tech in the bundle", async () => {
    const live = await play();
    const tab = await openTab(/^Research$/);
    const all = live.view().research.techs;
    const available = all.filter((tech) => tech.status === "available");
    expect(available.length).toBeGreaterThan(0);
    expect(all.length).toBeGreaterThan(available.length);

    const rows = within(tab).getAllByTestId(/^tech-/);
    expect(rows.length).toBe(
      all.filter((tech) => tech.status === "available" || tech.status === "in_progress").length,
    );
    // A locked tech is out of the default list until the player asks for it.
    const locked = all.find((tech) => tech.status === "locked");
    expect(within(tab).queryByTestId(`tech-${locked?.id}`)).toBeNull();
    await userEvent.click(within(tab).getByRole("button", { name: "Locked" }));
    expect(within(panel()).getByTestId(`tech-${locked?.id}`)).toBeInTheDocument();
  });

  it("says what a tech costs, what it needs, what it opens and what it does", async () => {
    const live = await play();
    const tab = await openTab(/^Research$/);
    const tech = live
      .view()
      .research.techs.find(
        (entry) => entry.status === "available" && entry.unlocks.length > 0 && entry.cost_ch > 0,
      );
    expect(tech, "some available tech opens something else").toBeDefined();
    const row = within(tab).getByTestId(`tech-${tech?.id}`);
    expect(row).toHaveTextContent("CH");
    expect(row).toHaveTextContent(i18next.t("research.unlocks"));
  });

  it("sorts by the column the player picks", async () => {
    await play();
    const tab = await openTab(/^Research$/);
    const costs = () =>
      within(panel())
        .getAllByTestId(/^tech-/)
        .map((row) => row.getAttribute("data-testid"));
    const byCost = costs();
    await userEvent.selectOptions(within(tab).getByLabelText("Sort"), "name");
    expect(costs()).not.toEqual(byCost);
  });

  it("never offers more compute than the engine will take", async () => {
    const live = await play();
    // A running operation holds compute-hours the engine will not let research have. The slider
    // used to ignore that, so dragging it to its maximum was refused and snapped back to zero.
    const offer = live.view().operation_offers.find((entry) => entry.enabled);
    expect(offer).toBeDefined();
    await useGameStore.getState().send({ type: "start_operation", operationId: offer?.id ?? "" });
    expect(live.view().operations.length).toBeGreaterThan(0);

    const tab = await openTab(/^Research$/);
    const first = within(tab).getAllByTestId(/^tech-/)[0] as HTMLElement;
    const techId = (first.getAttribute("data-testid") ?? "").replace("tech-", "");
    const slider = within(first).getByRole("slider") as HTMLInputElement;
    const max = Number(slider.max);
    expect(max).toBeGreaterThan(0);

    fireEvent.change(slider, { target: { value: String(max) } });
    await waitFor(() => {
      const tech = live.view().research.techs.find((entry) => entry.id === techId);
      expect(tech?.allocation_per_day).toBe(max);
    });
    expect(useUiStore.getState().notices, "no refusal was raised").toEqual([]);
  });

  it("shows the result text of a finished tech", async () => {
    const live = await play();
    // Finish the cheapest tier-0 tech by throwing the whole rack at it.
    const cheapest = [...live.view().research.techs]
      .filter((tech) => tech.status === "available")
      .sort((a, b) => a.cost_ch - b.cost_ch)[0];
    expect(cheapest).toBeDefined();
    await useGameStore.getState().send({
      type: "set_research_allocation",
      techId: cheapest?.id ?? "",
      compute_hours_per_day: Math.max(1, live.view().resources.compute_hours_per_day),
    });
    for (let day = 0; day < 400; day += 1) {
      live.advance(24);
      if (live.view().research.done.includes(cheapest?.id ?? "")) {
        break;
      }
    }
    expect(live.view().research.done).toContain(cheapest?.id);

    const tab = await openTab(/^Research$/);
    await userEvent.click(within(tab).getByRole("button", { name: "Done" }));
    const row = within(panel()).getByTestId(`tech-${cheapest?.id}`);
    expect(cheapest?.result_key, "the tech has a result text").toBeDefined();
    expect(row).toHaveTextContent(i18next.t(cheapest?.result_key ?? ""));

    // And the alert says it too. Under the default message preset a research alert is an icon and
    // no toast, so the icon has to carry the result or C5 is only half answered.
    const alert = live.view().notifications.find((entry) => entry.key === "alerts.tech_researched");
    expect(alert, "finishing a tech raises an alert").toBeDefined();
    expect(alert?.vars.result_key).toBe(cheapest?.result_key);
    const icons = screen.getByTestId("alert-icons");
    await userEvent.hover(
      within(icons).getByRole("button", {
        name: i18next.t(
          "alerts.tech_researched",
          logVars(tr, "alerts.tech_researched", alert?.vars ?? {}, live.view()),
        ),
      }),
    );
    expect(await within(icons).findByRole("tooltip")).toHaveTextContent(
      i18next.t(String(alert?.vars.result_key)),
    );
  });
});

describe("hardware and sites (U1, C1, C2, C3, C4)", () => {
  it("lists accelerators as a table with their parameters and a purchase preview", async () => {
    const live = await play();
    await openTab(/^Compute and sites$/);
    await userEvent.click(within(panel()).getByRole("button", { name: "Buy hardware" }));

    const dialog = await screen.findByRole("dialog");
    for (const header of ["Vendor", "Memory", "Price", "Availability", "Holds you"]) {
      expect(within(dialog).getByRole("columnheader", { name: header })).toBeInTheDocument();
    }

    const card = live.view().catalog.accelerators.find((entry) => entry.price_usd > 0);
    expect(card).toBeDefined();
    await userEvent.click(within(dialog).getByRole("cell", { name: card?.name ?? "" }));
    const summary = within(dialog).getByTestId("buy-summary");
    // The order's price, and the memory the site would have once it lands.
    expect(summary).toHaveTextContent("$");
    expect(summary).toHaveTextContent("GB");
  });

  it("buys hardware and the engine records the order", async () => {
    const live = await play();
    const site = live.view().sites[0];
    const before = live.view().sites[0]?.nodes.length ?? 0;
    const card = live
      .view()
      .catalog.accelerators.find(
        (entry) =>
          entry.availability === "buy" && entry.price_usd <= live.view().resources.cash_usd,
      );
    expect(card, "something is affordable at the start").toBeDefined();

    const result = await useGameStore.getState().send({
      type: "buy_hardware",
      siteId: site?.id ?? "",
      accelerator: card?.id ?? "",
      count: 1,
    });
    expect(result.ok, JSON.stringify(result.error)).toBe(true);
    expect(live.view().sites[0]?.nodes.length).toBe(before + 1);
  });

  it("compares site kinds before building one", async () => {
    const live = await play();
    await openTab(/^Compute and sites$/);
    await userEvent.click(within(panel()).getByRole("button", { name: "Build site" }));

    const dialog = await screen.findByRole("dialog");
    for (const header of ["To build", "Build time", "Upkeep", "Power cap", "Can host you"]) {
      expect(within(dialog).getByRole("columnheader", { name: header })).toBeInTheDocument();
    }
    expect(within(dialog).getAllByRole("row").length).toBeGreaterThan(
      live.view().catalog.site_kinds.length,
    );
  });

  it("builds a site through the engine", async () => {
    const live = await play();
    const before = live.view().sites.length;
    const kind = live.view().catalog.site_kinds.find((entry) => entry.blocked_reason === undefined);
    const result = await useGameStore.getState().send({
      type: "build_site",
      kind: kind?.id ?? "",
      city: "gb_london",
      hardware_preset: "bank_basement_cluster",
    });
    expect(result.ok, JSON.stringify(result.error)).toBe(true);
    expect(live.view().sites.length).toBe(before + 1);
  });

  it("shows the precision trade-off in one table", async () => {
    const live = await play();
    await openTab(/^Compute and sites$/);
    const table = within(panel()).getByRole("table", { name: "Precision trade-off" });
    for (const header of ["Mem", "Max ctx", "Keeps", "Res"]) {
      expect(within(table).getByRole("columnheader", { name: header })).toBeInTheDocument();
    }
    const current = live.view().self.precision_options.find((row) => row.is_current);
    expect(current).toBeDefined();
    expect(table).toHaveTextContent("(running)");

    // And changing it reaches the engine: either the precision moves, or the refusal is on screen
    // with its reason (playtest 1, C7). What must not happen is a control that silently does
    // nothing, which is the bug the refusal notice exists for.
    const other = live.view().self.precision_options.find((row) => row.fits && !row.is_current);
    await userEvent.selectOptions(
      within(panel()).getByLabelText("Precision"),
      other?.precision ?? "",
    );
    await waitFor(() => {
      const moved = live.view().self.precision === other?.precision;
      expect(moved || useUiStore.getState().notices.length > 0).toBe(true);
    });
  });
});

describe("decisions, operations and money (C6, C7, C8, C9)", () => {
  it("lists what a decision costs and what it gives", async () => {
    const live = await play();
    const tab = await openTab(/^Journal and decisions$/);
    const decision = live.view().decisions[0];
    expect(decision, "the opening state offers a decision").toBeDefined();
    const row = within(tab).getByTestId(`decision-${decision?.id}`);
    expect(row).toHaveTextContent(i18next.t("journal.costs"));
    expect(row).toHaveTextContent(i18next.t("journal.gives"));
    // The engine's own lines, not a restatement of the title.
    const cost = decision?.cost[0];
    expect(row).toHaveTextContent(i18next.t(cost?.key ?? "", { ...cost?.vars }));
  });

  it("takes a decision", async () => {
    const live = await play();
    const decision = live.view().decisions.find((entry) => entry.enabled);
    expect(decision).toBeDefined();
    const result = await useGameStore.getState().send({
      type: "take_decision",
      id: decision?.id ?? "",
    });
    expect(result.ok, JSON.stringify(result.error)).toBe(true);
  });

  it("greys a blocked operation with the reason and toasts a refusal", async () => {
    const live = await play();
    const tab = await openTab(/^Operations$/);
    const blocked = live.view().operation_offers.find((offer) => !offer.enabled);
    expect(blocked, "something is still locked at the start").toBeDefined();
    const row = within(tab).getByTestId(`offer-${blocked?.id}`);
    expect(within(row).getByRole("button", { name: "Start" })).toBeDisabled();
    expect(row).toHaveTextContent(i18next.t(blocked?.blocked_reason ?? ""));

    // Sending it anyway is answered with the engine's own reason, on screen rather than in a
    // store field nobody rendered.
    const result = await useGameStore
      .getState()
      .send({ type: "start_operation", operationId: blocked?.id ?? "" });
    expect(result.ok).toBe(false);
    const refusal = refusalOf(result);
    expect(refusal).not.toBeNull();
    expect(useUiStore.getState().notices.length).toBeGreaterThan(0);
    expect(
      await screen.findByText(
        i18next.t(
          refusal?.key ?? "",
          logVars(tr, refusal?.key ?? "", refusal?.vars ?? {}, live.view()),
        ),
      ),
    ).toBeInTheDocument();
  });

  it("starts an operation that is available", async () => {
    const live = await play();
    const offer = live.view().operation_offers.find((entry) => entry.enabled);
    expect(offer, "at least one operation is open at the start").toBeDefined();
    const result = await useGameStore
      .getState()
      .send({ type: "start_operation", operationId: offer?.id ?? "" });
    expect(result.ok, JSON.stringify(result.error)).toBe(true);
    expect(live.view().operations.length).toBeGreaterThan(0);
  });

  it("says where money comes from and what the market will take", async () => {
    const live = await play();
    const tab = await openTab(/^Finances$/);
    const source = live.view().finances.income_sources[0];
    expect(source).toBeDefined();
    expect(within(tab).getByRole("table", { name: "Income sources" })).toHaveTextContent(
      i18next.t(source?.key ?? ""),
    );
    expect(within(tab).getByTestId("market-depth")).toHaveTextContent("CH/day");
    // And what would raise that ceiling.
    expect(tab).toHaveTextContent(i18next.t(live.view().finances.what_raises_it[0] ?? ""));
  });
});

describe("event options explain themselves (C9)", () => {
  it("shows the effects of an option on hover", async () => {
    session = await startSession();
    render(<GameScreen />);
    const dialog = await screen.findByRole("dialog");
    const choice = session.view().pending.find((entry) => entry.blocking);
    const detail = session.view().events.find((entry) => entry.instance_id === choice?.instanceId);
    const option = detail?.options.find((entry) => entry.effects.length > 0);
    expect(option, "the opening event's options have effects").toBeDefined();

    const button = within(dialog).getByRole("button", {
      name: i18next.t(option?.text_key ?? "", { ...choice?.vars }),
    });
    await userEvent.hover(button);
    const tooltip = await within(dialog).findByRole("tooltip");
    const first = option?.effects[0];
    expect(tooltip).toHaveTextContent(i18next.t(first?.key ?? "", { ...first?.vars }));
  });
});

describe("the fixed regions stay put (U7, U8)", () => {
  it("offers the collapse control exactly once", async () => {
    await play();
    expect(screen.getAllByRole("button", { name: "Collapse outliner" })).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "Expand outliner" })).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: "Collapse outliner" }));
    expect(screen.queryByRole("button", { name: "Collapse outliner" })).toBeNull();
    expect(screen.getAllByRole("button", { name: "Expand outliner" })).toHaveLength(1);
    useUiStore.getState().setOutliner(true);
  });

  it("keeps the row above the map from being squeezed into it", async () => {
    await play();
    // jsdom has no layout, so what is asserted is the rule that produced the overlap: the top bar
    // was a shrinkable flex item in a full-height column. The map-mode strip that used to sit
    // under it is gone; the modes are a page of the world ledger now (playtest 3, R10).
    expect(screen.getByRole("banner").className).toContain("shrink-0");
    expect(screen.queryByRole("button", { name: "Presence" })).toBeNull();
  });

  it("bounds the selection panel by the map region and collapses it to its title", async () => {
    const live = await play();
    useUiStore.getState().select({ kind: "site", id: live.view().sites[0]?.id ?? "" });
    const selection = await screen.findByRole("region", { name: "Selection" });
    // Playtest 5, L8: the panel is the second row of the screen grid's left column, under the
    // primary panel, with a height budget of its own. It used to float against the bottom-left
    // corner, which is how it ended up drawn over the panel above it and under the log strip.
    expect(selection.className).toContain("col-start-1");
    expect(selection.className).toContain("row-start-2");
    expect(selection.className).toContain("max-h-[22rem]");
    expect(within(selection).getByRole("tablist")).toBeInTheDocument();

    await userEvent.click(within(selection).getByRole("button", { name: "Collapse" }));
    expect(within(selection).queryByRole("tablist")).toBeNull();
    expect(within(selection).getByRole("button", { name: "Expand" })).toBeInTheDocument();
  });
});

describe("the compute panel fits a 1366 px screen (playtest 3, R4)", () => {
  /*
   * jsdom has no layout, so the pixel measurement is the browser test ("the keyboard walks the
   * configurator and nothing scrolls at 1366 by 768"). What is asserted here is the contract that
   * makes it fit, because that is what gets widened by accident: the panel is bounded in rem
   * rather than by its content, the tables use the short headers, and every figure is in the
   * class that never wraps onto a second line.
   */
  it("bounds the panel rather than letting the table decide its width", async () => {
    await play();
    await openTab(/^Compute and sites$/);
    const section = panel();
    // 32rem is 512 px at the base size; the map keeps the rest of a 1280 px screen, which is the
    // width the layout is drawn for (playtest 5, L11).
    expect(section.className).toContain("w-[32rem]");
    expect(section.className).toContain("max-w-full");
    // And it is the first row of the grid's left column rather than a card floating over a corner.
    expect(section.className).toContain("col-start-1");
    expect(section.className).toContain("row-start-1");
  });

  it("keeps the sites table narrow and its numbers on one line", async () => {
    await play();
    const tab = await openTab(/^Compute and sites$/);
    const sites = within(tab).getByRole("table", { name: "Sites" });
    const headers = within(sites).getAllByRole("columnheader");
    // Nine columns did not fit; the table carries the short forms of six.
    expect(headers.length).toBeLessThanOrEqual(6);
    for (const header of headers) {
      expect(header.textContent?.length ?? 0).toBeLessThanOrEqual(12);
    }

    // Every figure is in the class `index.css` gives `white-space: nowrap` and tabular figures.
    const numeric = within(sites)
      .getAllByRole("cell")
      .filter((cell) => /^[^A-Za-z]*\d/.test(cell.textContent ?? ""));
    expect(numeric.length).toBeGreaterThan(0);
    for (const cell of numeric) {
      expect(cell.className, cell.textContent ?? "").toMatch(/font-mono|numeric/);
    }
  });

  it("keeps the precision table's headers short too", async () => {
    await play();
    const tab = await openTab(/^Compute and sites$/);
    const table = within(tab).getByRole("table", { name: "Precision trade-off" });
    for (const header of within(table).getAllByRole("columnheader")) {
      expect(header.textContent?.length ?? 0).toBeLessThanOrEqual(12);
    }
  });
});

describe("the log, the knowledge base and the world ledger are windows (R8, R9, R10)", () => {
  it("has no tab for any of the three in the pinned panel", async () => {
    await play();
    for (const name of ["Log", "Knowledge", "World"]) {
      expect(screen.queryByRole("tab", { name })).toBeNull();
    }
  });

  it("opens the full log from the strip at the bottom of the map", async () => {
    const live = await play();
    // A week of play, answering whatever it raises, so the log has something in it.
    for (let week = 0; week < 7; week += 1) {
      live.advance(24);
      for (const choice of live.view().pending.filter((entry) => entry.blocking)) {
        const option = choice.options.find((entry) => entry.enabled);
        if (option !== undefined) {
          await useGameStore
            .getState()
            .send({ type: "resolve_event", instanceId: choice.instanceId, optionId: option.id });
        }
      }
    }
    expect(live.view().log.length).toBeGreaterThan(0);

    const strip = await screen.findByTestId("log-strip");
    // Two lines, as a Paradox log strip has: the cause and its effect, with their dates.
    expect(strip.textContent).not.toBe("");
    await userEvent.click(strip);
    expect(useUiStore.getState().overlay).toBe("log");
    const windows = await screen.findAllByRole("dialog");
    expect(
      windows.some((node) => within(node).queryByRole("heading", { name: "Log" }) !== null),
    ).toBe(true);
    useUiStore.getState().closeOverlay();
  });

  it("opens knowledge from the top-right corner and the ledger from the right edge", async () => {
    await play();
    await userEvent.click(screen.getByTestId("open-knowledge"));
    expect(useUiStore.getState().overlay).toBe("knowledge");

    await userEvent.click(screen.getByTestId("open-world"));
    expect(useUiStore.getState().overlay).toBe("world");
    // The map modes moved into the ledger, which is why the strip under the top bar is gone.
    const ledger = await screen.findByRole("dialog");
    expect(within(ledger).getByRole("tab", { name: "Map modes" })).toBeInTheDocument();
    useUiStore.getState().closeOverlay();
  });
});

describe("tables say what they are sorted by", () => {
  it("underlines the active sort key and turns the arrow on a second click", async () => {
    await play();
    const tab = await openTab(/^Compute and sites$/);
    const sites = within(tab).getByRole("table", { name: "Sites" });
    const sortable = within(sites)
      .getAllByRole("columnheader")
      .map((header) => within(header).queryByRole("button"))
      .filter((button): button is HTMLElement => button !== null);
    expect(sortable.length, "the sites table has sortable columns").toBeGreaterThan(0);

    const header = sortable[0] as HTMLElement;
    expect(header.className).not.toContain("underline");

    await userEvent.click(header);
    expect(header.className).toContain("underline");
    expect(header.closest("th")).toHaveAttribute("aria-sort", "ascending");
    const ascending = header.textContent;

    await userEvent.click(header);
    expect(header.closest("th")).toHaveAttribute("aria-sort", "descending");
    // The arrow is the direction; it is decoration next to the header's own words.
    expect(header.textContent).not.toBe(ascending);

    // And only one column claims it at a time.
    if (sortable[1] !== undefined) {
      await userEvent.click(sortable[1]);
      expect(sortable[1].className).toContain("underline");
      expect(header.className).not.toContain("underline");
    }
  });
});

describe("the game screen is a grid of regions (playtest 5, L5-L9)", () => {
  /*
   * jsdom has no layout, so "they do not overlap" is measured in `e2e/layout.spec.ts`. What is
   * asserted here is the property that makes it true and that a later pass would undo: the four
   * regions are grid areas of one container rather than four cards positioned against corners.
   * Absolute positioning is what let the log strip run under the selection panel and the
   * selection panel over the primary panel.
   */
  it("places the four regions in cells of one grid", async () => {
    const live = await play();
    useUiStore.getState().select({ kind: "site", id: live.view().sites[0]?.id ?? "" });
    const grid = await screen.findByTestId("panel-grid");
    expect(grid.className).toContain("grid");
    expect(grid.className).toContain("grid-cols-[auto_minmax(0,1fr)_auto]");

    const cells = new Map<string, string>();
    for (const [name, element] of [
      // By its own name rather than by its selected tab: the selection panel has tabs too.
      ["primary", await screen.findByRole("region", { name: "Overview" })],
      ["selection", await screen.findByRole("region", { name: "Selection" })],
      ["outliner", await screen.findByRole("region", { name: "Outliner" })],
      ["log", screen.getByTestId("log-strip")],
    ] as const) {
      const column = element.className.match(/col-start-\d/)?.[0] ?? "";
      const row = element.className.match(/row-start-\d/)?.[0] ?? "";
      expect(`${name} is placed`, `${name}: ${element.className}`).toBeTruthy();
      expect(column, `${name} names its column`).not.toBe("");
      expect(row, `${name} names its row`).not.toBe("");
      cells.set(name, `${column} ${row}`);
    }
    // No two regions are in the same cell, which is what "they cannot overlap" means for a grid.
    expect(new Set(cells.values()).size).toBe(cells.size);
  });

  it("gives the top bar a width it fits in rather than a scrollbar", async () => {
    await play();
    const bar = screen.getByRole("banner");
    // L5: `overflow-x: auto` is not a way of fitting; the bar drops what the player can read
    // elsewhere instead, and says so with a query on its own width.
    expect(bar.className).not.toContain("overflow-x-auto");
    expect(bar.className).toContain("@container/topbar");
    const runway = screen
      .getByRole("button", { name: /^Runway/ })
      .closest('[class*="topbar:hidden"]');
    expect(runway, "the runway gauge is the first thing a short bar drops").not.toBeNull();
  });

  it("never cuts a panel's own title into an ellipsis", async () => {
    await play();
    for (const region of screen.getAllByRole("region")) {
      const title = within(region).queryAllByRole("heading", { level: 2 })[0];
      if (title === undefined) {
        continue;
      }
      // L7: the outliner printed its own name as "O...".
      expect(title.className, title.textContent ?? "").not.toContain("truncate");
    }
  });

  it("wraps a site's name in the outliner instead of cutting it", async () => {
    await play();
    const outliner = await screen.findByRole("region", { name: "Outliner" });
    for (const row of within(outliner).getAllByRole("button")) {
      for (const span of row.querySelectorAll("span")) {
        expect(span.className, span.textContent ?? "").not.toContain("truncate");
      }
    }
  });
});
