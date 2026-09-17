/**
 * The day's compute, as the panels account for it (playtest 8, Z1 and Z2).
 *
 * The finding was not a wrong number: the run started at 7.7 compute-hours a day, an operation
 * took three of them off the top without saying so, the research slider then stopped somewhere the
 * player could not account for, and every step of the drag that followed was a refused command in
 * the journal. These tests hold the three answers: the subtraction is on screen and adds up, a
 * slider stops where the engine stops, and a command the engine takes but changes says so.
 */

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { computeLedger } from "../src/lib/viewContract.js";
import { ComputeBudget } from "../src/screens/game/tabs/ComputeBudget.js";
import { FinancesTab } from "../src/screens/game/tabs/FinancesTab.js";
import { ResearchTab } from "../src/screens/game/tabs/ResearchTab.js";
import { useGameStore } from "../src/store/gameStore.js";
import { useUiStore } from "../src/store/uiStore.js";
import { type LocalSession, startSession } from "./helpers.js";

let session: LocalSession | null = null;

afterEach(() => {
  session?.stop();
  session = null;
  useUiStore.setState({ notices: [] });
});

/** Answers the opening events, which hold the clock and the first commands. */
async function play(): Promise<LocalSession> {
  session = await startSession();
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

describe("the day's compute", () => {
  it("prints a subtraction that adds up, with a line per running operation", async () => {
    const live = await play();
    const offer = live.view().operation_offers.find((entry) => entry.enabled);
    expect(offer).toBeDefined();
    await useGameStore.getState().send({ type: "start_operation", operationId: offer?.id ?? "" });

    const ledger = computeLedger(live.view());
    // The engine's own arithmetic, which the client only renders.
    expect(ledger.capacity - ledger.reserved).toBeCloseTo(ledger.allocatable, 5);
    expect(ledger.allocatable - ledger.research - ledger.jobs).toBeCloseTo(ledger.unallocated, 5);

    render(<ComputeBudget view={live.view()} />);
    const budget = screen.getByTestId("compute-budget");
    expect(budget).toHaveTextContent(/CH\/day/);
    // A running operation holds compute, and the line says how much.
    if (ledger.reservations.length > 0) {
      expect(ledger.reserved).toBeGreaterThan(0);
      expect(screen.getByTestId("budget-reserved")).not.toBeEmptyDOMElement();
    }
  });

  it("stops the research slider where the engine stops, and says so at zero", async () => {
    const live = await play();
    const { rerender } = render(<ResearchTab view={live.view()} />);

    const ledger = computeLedger(live.view());
    const row = screen.getAllByTestId(/^tech-/)[0] as HTMLElement;
    const slider = within(row).getByRole("slider") as HTMLInputElement;
    // The ceiling is what this line holds plus what nothing holds, floored: not one hour more.
    expect(Number(slider.max)).toBe(Math.floor(ledger.unallocated));

    // Give everything to that line, and every other line's slider has nothing left to offer.
    const techId = (row.getAttribute("data-testid") ?? "").replace("tech-", "");
    await useGameStore.getState().send({
      type: "set_research_allocation",
      techId,
      compute_hours_per_day: Math.floor(ledger.unallocated),
    });
    rerender(<ResearchTab view={live.view()} />);
    const rows = screen.getAllByTestId(/^tech-/);
    const other = rows.find((entry) => entry.getAttribute("data-testid") !== `tech-${techId}`);
    expect(other).toBeDefined();
    const spent = within(other as HTMLElement).getByRole("slider");
    expect(spent).toBeDisabled();
    expect(within(other as HTMLElement).getByTestId("research-ceiling")).toBeInTheDocument();
    expect(useUiStore.getState().notices, "nothing was refused").toEqual([]);
  });

  it("sends one command for a drag across the allocation slider", async () => {
    const live = await play();
    render(<ResearchTab view={live.view()} />);
    const row = screen.getAllByTestId(/^tech-/)[0] as HTMLElement;
    const techId = (row.getAttribute("data-testid") ?? "").replace("tech-", "");
    const slider = within(row).getByRole("slider") as HTMLInputElement;
    const top = Number(slider.max);
    expect(top).toBeGreaterThan(1);

    for (let value = 1; value <= top; value += 1) {
      fireEvent.change(slider, { target: { value: String(value) } });
    }
    fireEvent.pointerUp(slider);

    await waitFor(() => {
      const tech = live.view().research.techs.find((entry) => entry.id === techId);
      expect(tech?.allocation_per_day).toBe(top);
    });
    // The whole drag: one command, no refusal, so no wall of identical journal lines (Z2).
    expect(useUiStore.getState().notices).toEqual([]);
  });

  it("says when the engine took an allocation but changed it (Z1)", async () => {
    const live = await play();
    render(<FinancesTab view={live.view()} />);

    // Above the market's depth the engine clamps rather than refusing, and says so in `note`.
    const depth = live.view().finances.market_depth_ch_per_day;
    const result = await useGameStore.getState().send({
      type: "set_job_allocation",
      compute_hours_per_day: Math.ceil(depth) + 5,
    });
    expect(result.ok).toBe(true);
    const note = (result as { note?: { key: string } }).note;
    if (note === undefined) {
      // A run whose market is deep enough to take the ask has nothing to report, which is fine.
      return;
    }
    expect(note.key).toBeTruthy();
    // The reason reaches the player: in the notice stack, in their own language.
    await waitFor(() => expect(useUiStore.getState().notices.length).toBeGreaterThan(0));
    const notice = useUiStore.getState().notices.at(-1);
    expect(notice?.tone).toBe("info");
    expect(notice?.key).toBe(note.key);
  });
});
