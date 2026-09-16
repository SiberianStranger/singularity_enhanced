/**
 * The interface scale, and the "auto" the maintainer was doing by hand with the browser's zoom
 * (playtest 5, L12).
 *
 * The client is sized in rem against a design window of 1280 by 720, so "does the layout fit" is a
 * division rather than a judgement, and the scale is one number on the root. Auto picks the largest
 * scale the design still fits the window at; the slider is how the player takes it back.
 *
 * What the browser measures instead is that the picked scale actually fits ("the interface scale
 * follows a narrow window" in `e2e/layout.spec.ts`); jsdom has no layout, so what is checked here is
 * the arithmetic, the persistence and the control.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { SettingsControls } from "../src/components/SettingsControls.js";
import {
  autoUiScale,
  DESIGN_HEIGHT,
  DESIGN_WIDTH,
  UI_SCALE_MAX,
  UI_SCALE_MIN,
  useUiStore,
} from "../src/store/uiStore.js";

beforeEach(() => {
  useUiStore.setState({ uiScale: 1, uiScaleAuto: true, displayScale: 1 });
});

describe("auto picks the largest scale the layout fits at", () => {
  it("is 1 at the design size", () => {
    expect(autoUiScale(DESIGN_WIDTH, DESIGN_HEIGHT)).toBe(1);
  });

  it("shrinks the interface for a window narrower than the design", () => {
    const narrow = autoUiScale(1100, 700);
    expect(narrow).toBeLessThan(1);
    // And the design still fits at the scale it picked, which is the whole point of picking it.
    expect(1100 / narrow).toBeGreaterThanOrEqual(DESIGN_WIDTH);
  });

  it("grows it on a big screen and stops at the ceiling", () => {
    expect(autoUiScale(1500, 800)).toBeGreaterThan(1);
    expect(autoUiScale(1920, 1080)).toBe(UI_SCALE_MAX);
    expect(autoUiScale(3840, 2160)).toBe(UI_SCALE_MAX);
  });

  it("never goes below the floor the setting offers, however small the window", () => {
    expect(autoUiScale(400, 300)).toBe(UI_SCALE_MIN);
  });

  it("takes the axis that runs out first", () => {
    // A wide, short window is short: the scale follows the height.
    expect(autoUiScale(2400, 720)).toBe(autoUiScale(DESIGN_WIDTH, 720));
  });

  it("snaps down onto the slider's grid, never up past a scale that fits", () => {
    for (const width of [1290, 1333, 1409, 1666]) {
      const picked = autoUiScale(width, 4000);
      expect(Math.round(picked * 100) % 5, `${width} lands on the 5% grid`).toBe(0);
      expect(width / picked, `${width} still fits`).toBeGreaterThanOrEqual(DESIGN_WIDTH);
    }
  });
});

/** The second, smaller dial: the angular face alone, for a player who reads it less easily. */
const PROSE_DIAL = "Angular labels only";

describe("the scale setting", () => {
  it("offers auto and turns it off when the slider is moved", () => {
    render(<SettingsControls />);
    const auto = screen.getByTestId("ui-scale-auto");
    expect(auto).toBeChecked();

    const slider = screen.getByRole("slider", { name: /interface scale/i });
    fireEvent.change(slider, { target: { value: "90" } });

    expect(useUiStore.getState().uiScaleAuto).toBe(false);
    expect(useUiStore.getState().uiScale).toBeLessThan(1);
    expect(screen.getByTestId("ui-scale-auto")).not.toBeChecked();
  });

  it("goes back to following the window when auto is switched on again", async () => {
    useUiStore.setState({ uiScaleAuto: false, uiScale: 1.25 });
    render(<SettingsControls />);
    await userEvent.click(screen.getByTestId("ui-scale-auto"));
    expect(useUiStore.getState().uiScaleAuto).toBe(true);
  });

  it("keeps the prose dial separate from the interface dial", () => {
    // The two compose: the interface scale is the root font size, the text dial is a multiplier on
    // the type scale, and moving one may not move the other (playtest 3, R13).
    render(<SettingsControls />);
    const prose = screen.getByRole("slider", { name: PROSE_DIAL });
    fireEvent.change(prose, { target: { value: "115" } });
    expect(useUiStore.getState().uiScale).toBe(1);
    expect(useUiStore.getState().uiScaleAuto).toBe(true);
    expect(useUiStore.getState().displayScale).toBeGreaterThan(1);
  });
});
