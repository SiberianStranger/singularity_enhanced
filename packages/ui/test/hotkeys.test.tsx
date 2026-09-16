/**
 * Accelerators, per screen (ui-style-guide.md rule 4).
 *
 * The rule is that a control declares one letter, the letter is underlined in its label, and no two
 * controls on screen at the same time claim the same one. The second half of that is what breaks by
 * accident: a step is added to the configurator rail, a window gains a button, and two things
 * answer one key with no warning. The test reads `data-hotkey` off the rendered screen rather than
 * the tables that produce it, so a collision between a dialog and the screen behind it is caught
 * too, which is exactly the case a table cannot see.
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { ConfiguratorScreen } from "../src/screens/configurator/ConfiguratorScreen.js";
import { useConfigurator } from "../src/screens/configurator/store.js";
import { GameScreen } from "../src/screens/game/GameScreen.js";
import { useGameStore } from "../src/store/gameStore.js";
import { useUiStore } from "../src/store/uiStore.js";
import { type LocalSession, startSession } from "./helpers.js";

let session: LocalSession | null = null;

afterEach(() => {
  session?.stop();
  session = null;
  useUiStore.setState({ menuSection: null, overlay: null, notices: [] });
});

/** Every accelerator on screen, in document order, with the label that claims it. */
function claims(): { letter: string; label: string }[] {
  return [...document.querySelectorAll<HTMLElement>("[data-hotkey]")].map((element) => ({
    letter: (element.getAttribute("data-hotkey") ?? "").toLowerCase(),
    label: (element.textContent ?? "").trim().slice(0, 40),
  }));
}

function duplicates(): string[] {
  const seen = new Map<string, string[]>();
  for (const claim of claims()) {
    seen.set(claim.letter, [...(seen.get(claim.letter) ?? []), claim.label]);
  }
  return [...seen.entries()]
    .filter(([, labels]) => labels.length > 1)
    .map(([letter, labels]) => `${letter}: ${labels.join(" / ")}`);
}

describe("the configurator", () => {
  it("gives every visible control its own letter, explanation window included", async () => {
    useConfigurator.getState().reset();
    useUiStore.setState({ introSeen: [] });
    render(<ConfiguratorScreen />);

    // The explanation window is up over the rail on a first visit, so both are on screen at once.
    expect(screen.getByTestId("config-intro")).toBeInTheDocument();
    expect(duplicates()).toEqual([]);
    expect(claims().length).toBeGreaterThan(10);

    await userEvent.click(screen.getByRole("button", { name: "Got it" }));
    expect(duplicates()).toEqual([]);
  });

  it("keeps the letters unique on every step", async () => {
    useConfigurator.getState().reset();
    useUiStore.setState({ introSeen: [] });
    render(<ConfiguratorScreen />);
    for (let step = 0; step < 9; step += 1) {
      useConfigurator.getState().goToStep(step);
      const intro = screen.queryByRole("button", { name: "Got it" });
      if (intro !== null) {
        await userEvent.click(intro);
      }
      expect(duplicates(), `step ${step}`).toEqual([]);
    }
  });
});

describe("the game screen", () => {
  it("gives every visible control its own letter", async () => {
    session = await startSession();
    render(<GameScreen />);
    expect(duplicates()).toEqual([]);
  });

  it("keeps them unique while a window is open over the map", async () => {
    session = await startSession();
    render(<GameScreen />);
    for (const overlay of ["log", "knowledge", "world"] as const) {
      useUiStore.getState().openOverlay(overlay);
      expect(duplicates(), overlay).toEqual([]);
    }
    useUiStore.getState().closeOverlay();

    useUiStore.getState().openMenu("root");
    expect(duplicates(), "menu").toEqual([]);
  });

  it("keeps them unique while the opening is up", async () => {
    session = await startSession();
    useGameStore.getState().setOpeningPending(true);
    render(<GameScreen />);
    expect(screen.getByTestId("opening-story")).toBeInTheDocument();
    expect(duplicates()).toEqual([]);
    useGameStore.getState().setOpeningPending(false);
  });
});
