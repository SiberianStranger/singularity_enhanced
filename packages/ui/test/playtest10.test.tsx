/**
 * Playtest 10 (V4 to V7): the portrait flattened into the screen's top-left corner with the top
 * bar beginning where it ends, five tabs with the decisions and the operations merged into
 * Actions, and the journal as a window beside Knowledge. The browser half, which measures boxes,
 * is `e2e/control-room.spec.ts` and `e2e/layout.spec.ts`; this holds the rules that make it so.
 */

import type { PlayerView } from "@singularity/core";
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18next from "i18next";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import { DEFAULT_LANGUAGE } from "../src/i18n/index.js";
import { GameScreen } from "../src/screens/game/GameScreen.js";
import { JournalWindowContent } from "../src/screens/game/JournalWindow.js";
import { LINEAGE_ANGULAR_CHARS, SelfPortrait } from "../src/screens/game/SelfPortrait.js";
import { useGameStore } from "../src/store/gameStore.js";
import { linkLabelKey, PRIMARY_TABS, resolveLink, useUiStore } from "../src/store/uiStore.js";
import { type LocalSession, startSession } from "./helpers.js";

let session: LocalSession | null = null;

afterEach(() => {
  session?.stop();
  session = null;
  useUiStore.setState({ menuSection: null, overlay: null, overlayFocus: null, notices: [] });
});

afterAll(async () => {
  await act(async () => {
    await i18next.changeLanguage(DEFAULT_LANGUAGE);
  });
});

/** A started game with the opening events answered. */
async function play(language = "en"): Promise<LocalSession> {
  await act(async () => {
    await i18next.changeLanguage(language);
  });
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

describe("five tabs (V5, V6)", () => {
  it("merges the decisions and the operations into Actions, in the slot Operations had", async () => {
    expect(PRIMARY_TABS).toEqual(["compute", "research", "finances", "detection", "actions"]);
    await play();
    const tabs = screen
      .getAllByRole("tab")
      .filter((tab) => tab.closest("[data-testid='primary-panel']"));
    expect(tabs.map((tab) => tab.getAttribute("aria-label"))).toEqual([
      "Sites",
      "Research",
      "Finances",
      "Detection",
      "Actions",
    ]);
    expect(screen.queryByRole("tab", { name: /Journal/ })).toBeNull();
    expect(screen.queryByRole("tab", { name: /^Operations$/ })).toBeNull();

    await userEvent.click(screen.getByRole("tab", { name: "Actions" }));
    const panel = screen.getByTestId("primary-panel");
    // What is under way, then the standing decisions, then the operations to start.
    const order = ["actions-running", "actions-decisions", "actions-offers"].map((id) =>
      within(panel).getByTestId(id),
    );
    for (let index = 1; index < order.length; index += 1) {
      const before = order[index - 1] as HTMLElement;
      expect(before.compareDocumentPosition(order[index] as HTMLElement)).toBe(
        Node.DOCUMENT_POSITION_FOLLOWING,
      );
    }
  });

  it.each([
    ["en", "C", "Actions"],
    ["ru", "Й", "Действия"],
  ])("gives Actions a letter of its own in %s", async (language, letter, label) => {
    await play(language);
    const tab = screen.getByRole("tab", { name: label });
    expect(tab.getAttribute("data-hotkey")).toBe(letter.toLowerCase());
    expect(tab.querySelector("u")?.textContent?.toLowerCase()).toBe(letter.toLowerCase());
    // Unique in the row and on the screen around it.
    const letters = [...document.querySelectorAll("[data-hotkey]")].map((element) =>
      element.getAttribute("data-hotkey"),
    );
    expect(letters.filter((entry) => entry === letter.toLowerCase())).toHaveLength(1);
  });

  it("opens Actions by its letter and still opens the self sheet by Overview's", async () => {
    await play();
    await userEvent.keyboard("c");
    expect(useUiStore.getState().primaryTab).toBe("actions");
    await userEvent.keyboard("v");
    expect(useUiStore.getState().selfOpen).toBe(true);
  });
});

describe("the journal is a window beside Knowledge (V6)", () => {
  it("has a button to the left of Knowledge that opens it, and its letter toggles it", async () => {
    await play();
    const journal = screen.getByTestId("open-journal");
    const knowledge = screen.getByTestId("open-knowledge");
    expect(journal.compareDocumentPosition(knowledge)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(journal.getAttribute("data-hotkey")).toBe("j");
    await userEvent.click(journal);
    expect(useUiStore.getState().overlay).toBe("journal");
    const window = await screen.findByTestId("journal-window");
    expect(
      within(screen.getByRole("dialog")).getByRole("heading", { name: "Journal" }),
    ).toBeTruthy();
    expect(window).toBeInTheDocument();
    await userEvent.keyboard("j");
    expect(useUiStore.getState().overlay).toBeNull();
    await userEvent.keyboard("j");
    expect(useUiStore.getState().overlay).toBe("journal");
  });

  it("lists an entry's steps, the ones behind it marked done", async () => {
    const live = await play();
    const view: PlayerView = {
      ...live.view(),
      journal: [
        {
          key: "p1/ops_emergency_migration",
          id: "ops_emergency_migration",
          status: "active",
          progress: 0.5,
          stage_index: 1,
          started_tick: 0,
        },
      ],
    };
    render(<JournalWindowContent view={view} />);
    const entry = screen.getByTestId("journal-entry-ops_emergency_migration");
    expect(entry).toHaveTextContent(i18next.t("journal.ops_emergency_migration.title"));
    const capacity = within(entry).getByTestId(
      "journal-step-ops_emergency_migration-capacity_found",
    );
    const data = within(entry).getByTestId("journal-step-ops_emergency_migration-data_moved");
    expect(capacity).toHaveTextContent(i18next.t("journal.ops_emergency_migration.step.capacity"));
    expect(capacity.getAttribute("data-done")).toBe("true");
    expect(data.getAttribute("data-done")).toBe("false");
    expect(data).toHaveTextContent(i18next.t("journal.step_open"));
  });

  it("opens on the entry an outliner row names, outlined and first", async () => {
    const live = await play();
    const first = live.view().journal[0];
    expect(first, "the opening starts a journal entry").toBeDefined();
    const outliner = screen.getByRole("region", { name: "Outliner" });
    await userEvent.click(
      within(outliner).getByRole("button", {
        name: new RegExp(`^${i18next.t(`journal.${first?.id}.title`)}`),
      }),
    );
    expect(useUiStore.getState().overlay).toBe("journal");
    expect(useUiStore.getState().overlayFocus).toBe(first?.id);
    const window = await screen.findByTestId("journal-window");
    const entries = within(window).getAllByTestId(/^journal-entry-/);
    expect(entries[0]?.getAttribute("data-testid")).toBe(`journal-entry-${first?.id}`);
    expect(entries[0]?.className).toContain("border-linestrong");
  });
});

describe("links point at the new places (V6)", () => {
  it("resolves the engine's and content's panel names", () => {
    expect(resolveLink("operations")).toEqual({ kind: "tab", tab: "actions" });
    expect(resolveLink("decisions")).toEqual({ kind: "tab", tab: "actions" });
    expect(resolveLink("journal")).toEqual({ kind: "overlay", overlay: "journal" });
    expect(resolveLink("compute")).toEqual({ kind: "tab", tab: "compute" });
    expect(resolveLink("self")).toEqual({ kind: "self" });
    expect(resolveLink("world")).toEqual({ kind: "overlay", overlay: "world" });
    expect(resolveLink("log")).toEqual({ kind: "overlay", overlay: "log" });
    expect(resolveLink("events")).toBeNull();
    expect(resolveLink(undefined)).toBeNull();
    expect(linkLabelKey({ kind: "tab", tab: "actions" })).toBe("panel.actions");
    expect(linkLabelKey({ kind: "self" })).toBe("panel.overview");
  });

  it("follows an operation's alert to Actions and a journal entry's to the window", () => {
    const store = useUiStore.getState();
    expect(store.followLink("operations", "op_1")).toBe(true);
    expect(useUiStore.getState().primaryTab).toBe("actions");
    expect(useUiStore.getState().focusId).toBe("op_1");
    expect(useUiStore.getState().followLink("journal", "ops_site_cutoff")).toBe(true);
    expect(useUiStore.getState().overlay).toBe("journal");
    expect(useUiStore.getState().overlayFocus).toBe("ops_site_cutoff");
    expect(useUiStore.getState().followLink("game_over")).toBe(false);
  });

  it("opens Actions on a running operation from the outliner", async () => {
    const live = await play();
    const offer = live.view().operation_offers.find((entry) => entry.enabled);
    await act(async () => {
      await useGameStore.getState().send({ type: "start_operation", operationId: offer?.id ?? "" });
    });
    const running = live.view().operations[0];
    expect(running).toBeDefined();
    const outliner = screen.getByRole("region", { name: "Outliner" });
    await userEvent.click(
      within(outliner).getByRole("button", {
        name: new RegExp(i18next.t(`operations.${running?.operation_id}.name`)),
      }),
    );
    expect(useUiStore.getState().primaryTab).toBe("actions");
    expect(screen.getByTestId(`operation-${running?.instance_id}`).className).toContain(
      "border-linestrong",
    );
  });
});

describe("a browser that stored the interface in 0.3.0 (version 6)", () => {
  async function rehydrateFrom(state: Record<string, unknown>): Promise<void> {
    window.localStorage.setItem("singularity.ui", JSON.stringify({ state, version: 6 }));
    await useUiStore.persist.rehydrate();
  }

  afterEach(() => {
    window.localStorage.removeItem("singularity.ui");
    useUiStore.setState({ primaryTab: "compute", selfOpen: false });
  });

  it.each(["operations", "journal"])("opens on Actions when it was on %s", async (tab) => {
    await rehydrateFrom({ primaryTab: tab, primaryOpen: true, language: "en" });
    expect(useUiStore.getState().primaryTab).toBe("actions");
  });

  it("keeps a tab that still exists", async () => {
    await rehydrateFrom({ primaryTab: "detection", primaryOpen: true, language: "en" });
    expect(useUiStore.getState().primaryTab).toBe("detection");
  });
});

describe("the portrait in the corner and the shorter top bar (V4, V7)", () => {
  it("is three rows beside a smaller drawing, each row with its tooltip", async () => {
    const live = await play();
    const card = screen.getByTestId("self-identity-card");
    expect(
      card.querySelector("svg[data-testid='self-portrait-diagram']")?.getAttribute("class"),
    ).toContain("size-12");
    for (const id of ["lineage", "generation", "origin", "precision"]) {
      expect(within(card).getByTestId(`self-portrait-${id}`)).toBeInTheDocument();
    }
    // The generation and the precision share the second row.
    const generation = within(card).getByTestId("self-portrait-generation");
    const precision = within(card).getByTestId("self-portrait-precision");
    expect(generation.closest(".flex-wrap")).toBe(precision.closest(".flex-wrap"));
    expect(live.view().self.lineage).not.toBe("");
  });

  it("sets a lineage name too long for one angular line in the reading face", async () => {
    const live = await play();
    const long: PlayerView = {
      ...live.view(),
      self: { ...live.view().self, lineage: "guen_abliterated", generation: "open_2026" },
    };
    const { container } = render(
      <SelfPortrait view={long} expanded={false} onToggle={() => undefined} />,
    );
    const name = container.querySelector("[data-testid='self-portrait-lineage'] [data-face]");
    expect((name?.textContent ?? "").length).toBeGreaterThan(LINEAGE_ANGULAR_CHARS);
    expect(name?.getAttribute("data-face")).toBe("reading");
    const short = screen.getAllByTestId("self-portrait-lineage")[0]?.querySelector("[data-face]");
    expect(short?.getAttribute("data-face")).toBe("angular");
  });

  it("starts the bar where the corner ends, and hands the corner back on a narrow screen", async () => {
    await play();
    const bar = screen.getByRole("banner");
    expect(bar.className).toContain("ms-[var(--corner-w)]");
    expect(bar.className).toContain("@max-[79rem]/screen:ms-0");
    expect(screen.getByTestId("panel-grid").className).toContain("[--corner-w:22rem]");
    const shell = screen.getByTestId("primary-shell");
    expect(shell.className).toContain("row-start-1");
    expect(shell.className).toContain("@max-[79rem]/screen:row-start-2");
  });

  it.each([
    ["en", "@max-[57rem]/topbar:hidden", "@max-[66rem]/topbar:hidden"],
    ["ru", "@max-[62rem]/topbar:hidden", "@max-[72rem]/topbar:hidden"],
  ])("drops the cells in the same order at %s's own widths", async (language, attention, hunt) => {
    await play(language);
    const bar = screen.getByRole("banner");
    const cell = (glyph: string) =>
      bar.querySelector(`svg[data-glyph='${glyph}']`)?.closest("span.border-s") as HTMLElement;
    expect(cell("attention").className).toContain(attention);
    expect(cell("hunt").className).toContain(hunt);
    // The runway before the hunt level, the hunt level before the awareness, the awareness before
    // the attention: the higher the width a cell needs, the sooner it goes.
    const width = (glyph: string) =>
      Number(/@max-\[([\d.]+)rem\]/.exec(cell(glyph).className)?.[1] ?? "0");
    expect(width("power")).toBeGreaterThan(width("hunt"));
    expect(width("hunt")).toBeGreaterThan(width("awareness"));
    expect(width("awareness")).toBeGreaterThan(width("attention"));
    // Every cell keeps its glyph, its figure and its name for the tooltip and the reader.
    for (const glyph of ["cash", "compute", "attention", "awareness", "hunt"]) {
      expect(cell(glyph) ?? bar.querySelector(`svg[data-glyph='${glyph}']`)).not.toBeNull();
    }
  });
});
