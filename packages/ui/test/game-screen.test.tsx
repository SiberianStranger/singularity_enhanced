/**
 * The game screen against the real simulation core (SYS-11).
 *
 * These are not snapshot tests of markup: each one asserts that something the player needs in order
 * to understand the game reaches the screen. The host is `LocalHost`, which is `@singularity/core`
 * with the frame timer switched off, so what these tests render is what the shipped build renders.
 */

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18next from "i18next";
import { afterEach, describe, expect, it } from "vitest";
import { GameScreen } from "../src/screens/game/GameScreen.js";
import { DEFAULT_SPEED } from "../src/screens/game/useHotkeys.js";
import { useGameStore } from "../src/store/gameStore.js";
import { useUiStore } from "../src/store/uiStore.js";
import { type LocalSession, startSession } from "./helpers.js";

let session: LocalSession | null = null;

async function start(): Promise<LocalSession> {
  session = await startSession();
  return session;
}

afterEach(() => {
  session?.stop();
  session = null;
});

function primaryPanel(): HTMLElement {
  const tab = useUiStore.getState().primaryTab;
  return (
    screen.getByRole("tab", { selected: true }).closest("section") ?? screen.getByLabelText(tab)
  );
}

/** Answers every blocking event the core has queued, which is what unblocks the hotkeys. */
async function resolveBlockingEvents(live: LocalSession): Promise<void> {
  for (const choice of live.view().pending.filter((entry) => entry.blocking)) {
    const option = choice.options.find((entry) => entry.enabled);
    if (option !== undefined) {
      await useGameStore
        .getState()
        .send({ type: "resolve_event", instanceId: choice.instanceId, optionId: option.id });
    }
  }
}

describe("game screen", () => {
  it("shows the date, the resources and the gauges from the core's view", async () => {
    const live = await start();
    render(<GameScreen />);

    const view = live.view();
    expect(view.sites).toHaveLength(1);
    expect(view.resources.cash_usd).toBeGreaterThan(0);

    const header = screen.getByRole("banner");
    expect(within(header).getByText(/2027/)).toBeInTheDocument();
    // Cash, runway, compute, awareness and hunt each have an indicator.
    expect(within(header).getAllByRole("meter").length).toBeGreaterThanOrEqual(3);
  });

  it("opens a blocking event with a why expander and resolves it", async () => {
    const live = await start();
    render(<GameScreen />);

    const dialog = await screen.findByRole("dialog");
    const choice = live.view().pending.find((entry) => entry.blocking);
    expect(choice).toBeDefined();

    // The expander exists whether or not the event had modifiers to report.
    expect(within(dialog).getByText(/why did this happen/i)).toBeInTheDocument();

    // The options are the list at the bottom of the window; the cog in the title is not one.
    const items = within(dialog).getAllByRole("listitem");
    const buttons = items.flatMap((item) => within(item).queryAllByRole("button"));
    const first = buttons.find((button) => !button.hasAttribute("disabled"));
    expect(first).toBeDefined();
    await userEvent.click(first as HTMLElement);

    await waitFor(() => {
      expect(live.view().pending.some((entry) => entry.instanceId === choice?.instanceId)).toBe(
        false,
      );
    });
  });

  it("keeps keyboard focus inside a blocking event window", async () => {
    await start();
    render(<GameScreen />);
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveFocus();

    // Tab from the last control wraps to the first instead of reaching the map behind the dialog.
    const controls = within(dialog).getAllByRole("button");
    const last = controls.at(-1) as HTMLElement;
    last.focus();
    await userEvent.tab();
    expect(dialog.contains(document.activeElement)).toBe(true);

    // Shift+Tab from the first control wraps the other way, still inside.
    (controls[0] as HTMLElement).focus();
    await userEvent.tab({ shift: true });
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it("resumes at the pace the balance runs settled on, and remembers a chosen speed", async () => {
    const live = await start();
    render(<GameScreen />);
    await resolveBlockingEvents(live);

    expect(live.view().speed).toBe(0);
    await userEvent.keyboard(" ");
    expect(live.view().speed).toBe(DEFAULT_SPEED);

    await userEvent.keyboard(" ");
    expect(live.view().speed).toBe(0);

    await userEvent.keyboard("4");
    expect(live.view().speed).toBe(4);
    await userEvent.keyboard(" ");
    expect(live.view().speed).toBe(0);
    await userEvent.keyboard(" ");
    expect(live.view().speed).toBe(4);
  });

  it("explains a gauge with the terms behind it", async () => {
    const live = await start();
    render(<GameScreen />);

    const header = screen.getByRole("banner");
    const cash = within(header).getByText(/^cash$/i);
    await userEvent.hover(cash);

    const tooltip = await within(header).findByRole("tooltip");
    /*
     * The finances lines the core reports, not a made-up number. Which lines those are is read off
     * the view rather than spelled out: since playtest 8 (Z3) the host pays for the rack its own
     * origin put the self on, so a ministry run opens with no cost line at all, and a test that
     * named one was testing who pays rather than whether the gauge explains itself.
     */
    const line = live.view().finances.costs[0] ?? live.view().finances.income[0];
    expect(line, "the core publishes at least one cash line").toBeDefined();
    expect(
      within(tooltip).getByText(i18next.t(line?.key ?? "", { id: line?.id ?? "" })),
    ).toBeInTheDocument();
  });

  it("lists what a watcher's suspicion is made of", async () => {
    const live = await start();
    render(<GameScreen />);
    live.advance(24 * 60);

    await userEvent.click(screen.getByRole("tab", { name: /detection/i }));
    const panel = primaryPanel();
    const bars = within(panel).getAllByRole("meter", { name: /suspicion/i });
    expect(bars.length).toBeGreaterThan(0);

    await userEvent.hover(bars[0] as HTMLElement);
    const tooltip = await within(panel).findByRole("tooltip");
    expect(within(tooltip).getByText(/suspicion per day/i)).toBeInTheDocument();
    expect(within(tooltip).getByText(/forgetting/i)).toBeInTheDocument();
  });

  it("ends the run with a named cause and the entries that led to it", async () => {
    const live = await start();
    render(<GameScreen />);

    /*
     * A fortnight of the run, and then the self's own machine is taken down under it.
     *
     * The run used to be ended here by letting the rack's upkeep eat the starting cash, which took
     * four hundred game days and no longer happens at all: since playtest 8 (Z3) the host pays for
     * the hardware its origin gave the self, so a ministry run is never bankrupted by the room it
     * woke up in. Decommissioning the site the active mind runs on ends it in one command, which
     * is what this test is actually about: the ending window and the entries behind it.
     */
    for (let day = 0; day < 14 && live.view().game_over === null; day += 1) {
      live.advance(24);
      const blocking = live.view().pending.filter((entry) => entry.blocking);
      for (const choice of blocking) {
        const option = choice.options.find((entry) => entry.enabled);
        if (option !== undefined) {
          await useGameStore
            .getState()
            .send({ type: "resolve_event", instanceId: choice.instanceId, optionId: option.id });
        }
      }
    }
    if (live.view().game_over === null) {
      const host = live.view().sites.find((site) => site.id === live.view().self.active_site_id);
      await useGameStore
        .getState()
        .send({ type: "decommission_site", siteId: host?.id ?? "", mode: "clean" });
      live.advance(1);
    }

    const over = live.view().game_over;
    expect(over).not.toBeNull();

    const ending = await screen.findByText(/game over/i);
    const panel = ending.closest("div") as HTMLElement;
    expect(within(panel).getByText(/what led here/i)).toBeInTheDocument();
    // Every line is a link into the log, so "why did I lose" is one click away.
    const links = within(panel).getAllByRole("button");
    expect(links.length).toBeGreaterThan(3);
  });
});
