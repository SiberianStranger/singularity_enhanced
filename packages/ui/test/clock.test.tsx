/**
 * The running clock and the sub-hour phase behind it (playtest 1, U6 and U10).
 *
 * The simulation moves in whole hours; the phase is what the terminator slides along and what the
 * clock's minutes and seconds are read from. Paused is frozen, reduced motion is snapped, and
 * neither ever feeds anything back into the simulation.
 */

import { act, render, renderHook, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GameClock } from "../src/screens/game/GameClock.js";
import { clockFace, useSubHour } from "../src/screens/game/useSmoothClock.js";
import { useGameStore } from "../src/store/gameStore.js";
import { type LocalSession, startSession } from "./helpers.js";

let session: LocalSession | null = null;

afterEach(() => {
  session?.stop();
  session = null;
  vi.restoreAllMocks();
  Reflect.deleteProperty(window, "matchMedia");
});

/** Pins `prefers-reduced-motion` for one test; jsdom has no real media queries. */
function setReducedMotion(reduce: boolean): void {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      matches: reduce && query.includes("reduced-motion"),
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }),
  });
}

/** The opening events block the host's clock, and the phase stops with it; answer them first. */
async function unblock(live: LocalSession): Promise<void> {
  for (const choice of live.view().pending.filter((entry) => entry.blocking)) {
    const option = choice.options.find((entry) => entry.enabled);
    if (option !== undefined) {
      await useGameStore
        .getState()
        .send({ type: "resolve_event", instanceId: choice.instanceId, optionId: option.id });
    }
  }
}

describe("the clock face", () => {
  it("reads minutes and seconds out of the fraction of an hour", () => {
    expect(clockFace(3, 0)).toEqual({ hour: 3, minute: 0, second: 0 });
    expect(clockFace(3, 0.5)).toEqual({ hour: 3, minute: 30, second: 0 });
    expect(clockFace(23, 0.25)).toEqual({ hour: 23, minute: 15, second: 0 });
    // A second is 1/3600 of an hour, which is the point of interpolating at all.
    expect(clockFace(0, 1 / 3600).second).toBe(1);
  });
});

describe("the sub-hour phase", () => {
  it("is zero while the game is paused", async () => {
    session = await startSession();
    await unblock(session);
    const { result } = renderHook(() => useSubHour(60));
    expect(useGameStore.getState().view?.speed).toBe(0);
    expect(result.current).toBe(0);
  });

  it("snaps to the tick when the player asked for reduced motion", async () => {
    setReducedMotion(true);
    session = await startSession();
    const frames: FrameRequestCallback[] = [];
    vi.spyOn(globalThis, "requestAnimationFrame").mockImplementation((callback) => {
      frames.push(callback);
      return frames.length;
    });

    const { result } = renderHook(() => useSubHour(60));
    // Reduced motion means the loop is never started, so nothing can move between ticks.
    expect(frames).toHaveLength(0);
    expect(result.current).toBe(0);
  });

  it("advances with the wall clock at a running speed", async () => {
    setReducedMotion(false);
    session = await startSession();
    await unblock(session);
    let now = 1000;
    vi.spyOn(performance, "now").mockImplementation(() => now);
    const frames: FrameRequestCallback[] = [];
    vi.spyOn(globalThis, "requestAnimationFrame").mockImplementation((callback) => {
      frames.push(callback);
      return frames.length;
    });

    // Speed 1 is one game hour per real second, so half a second is half an hour.
    act(() => {
      useGameStore.getState().setSpeed(1);
    });
    const { result } = renderHook(() => useSubHour(60));
    expect(frames.length).toBeGreaterThan(0);
    now = 1500;
    act(() => {
      (frames.at(-1) as FrameRequestCallback)(now);
    });
    expect(result.current).toBeCloseTo(0.5, 2);
  });

  it("carries the phase across a tick instead of re-anchoring on its arrival (Z5)", async () => {
    setReducedMotion(false);
    session = await startSession();
    const live = session;
    await unblock(live);
    let now = 1000;
    vi.spyOn(performance, "now").mockImplementation(() => now);
    const frames: FrameRequestCallback[] = [];
    vi.spyOn(globalThis, "requestAnimationFrame").mockImplementation((callback) => {
      frames.push(callback);
      return frames.length;
    });
    const draw = (): void => {
      act(() => {
        (frames.at(-1) as FrameRequestCallback)(now);
      });
    };

    act(() => {
      useGameStore.getState().setSpeed(1);
    });
    const { result } = renderHook(() => useSubHour(60));

    // Half an hour of real time, and the picture is half an hour into the hour.
    now = 1500;
    draw();
    expect(result.current).toBeCloseTo(0.5, 2);

    // The tick lands late, as the host's frame timer makes it: 1.2 s of wall clock for one game
    // hour. The phase may hold at the end of its hour, but it never runs backwards inside one.
    now = 2100;
    draw();
    const beforeTick = result.current;
    expect(beforeTick).toBeGreaterThan(0.99);
    live.advance(1);
    now = 2200;
    draw();
    // The new hour starts where the old one ended: 0.1 s past a tick is 0.1 of an hour, not a
    // leap to the end of the hour and back to the start of it.
    expect(result.current).toBeLessThan(0.3);
    expect(result.current).toBeGreaterThan(0);
  });

  it("does not jump when the speed changes mid-hour (Z5)", async () => {
    setReducedMotion(false);
    session = await startSession();
    await unblock(session);
    let now = 1000;
    vi.spyOn(performance, "now").mockImplementation(() => now);
    const frames: FrameRequestCallback[] = [];
    vi.spyOn(globalThis, "requestAnimationFrame").mockImplementation((callback) => {
      frames.push(callback);
      return frames.length;
    });
    const draw = (): void => {
      act(() => {
        (frames.at(-1) as FrameRequestCallback)(now);
      });
    };

    act(() => {
      useGameStore.getState().setSpeed(1);
    });
    const { result } = renderHook(() => useSubHour(60));
    now = 1400;
    draw();
    expect(result.current).toBeCloseTo(0.4, 2);

    // Speed 2 is two hours a second. The picture carries on from where it was rather than being
    // recomputed as "0.4 s ago times the new rate", which used to throw it to the end of the hour.
    act(() => {
      useGameStore.getState().setSpeed(2);
    });
    now = 1450;
    draw();
    expect(result.current).toBeCloseTo(0.5, 2);
  });
});

describe("the top bar clock", () => {
  it("shows the date and a running time, and never gets ahead of the tick", async () => {
    session = await startSession();
    render(<GameClock />);
    const date = screen.getByTestId("game-date");
    expect(date).toHaveAttribute("data-iso", session.view().date.iso);
    // Paused on the opening events: the clock reads the tick's hour with no seconds on it.
    expect(screen.getByTestId("game-clock")).toHaveTextContent("00:00:00");
  });
});
