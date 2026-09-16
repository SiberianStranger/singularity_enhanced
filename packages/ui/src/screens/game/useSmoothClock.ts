/**
 * The sub-hour phase between simulation ticks (playtest 1, U6 and U10).
 *
 * The simulation only moves in whole hours, so anything drawn from the clock alone moves in steps:
 * the day/night terminator jumped fifteen degrees at a time, and the top bar had no seconds at all.
 * This hook interpolates where inside the current hour the game is, from the wall clock and the
 * speed the player chose (`SPEED_HOURS_PER_SECOND`, the same table the host converts real time into
 * ticks with), so the two agree and the interpolation always lands exactly on the next tick.
 *
 * It never feeds the simulation. Nothing here is read by a command or a save; it is presentation
 * for the terminator and for the clock face.
 *
 * Paused means frozen, and reduced motion means snapped to the tick: both return 0, which is the
 * unanimated behavior the client had before (SYS-11 "Accessibility").
 */

import { SPEED_HOURS_PER_SECOND } from "@singularity/core";
import { useEffect, useRef, useState } from "react";
import { useGameStore } from "../../store/gameStore.js";

/** Live answer to `prefers-reduced-motion`, or false where there is no media-query support. */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return false;
    }
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = (): void => setReduced(query.matches);
    if (typeof query.addEventListener === "function") {
      query.addEventListener("change", onChange);
      return () => query.removeEventListener("change", onChange);
    }
    return;
  }, []);

  return reduced;
}

function nowMs(): number {
  return typeof performance === "undefined" ? Date.now() : performance.now();
}

/** A tick is an hour, so the phase never reaches 1: at 1 the next tick has already happened. */
const MAX_PHASE = 0.999;

/**
 * How far into the current game hour the wall clock has carried us, in [0, 1).
 *
 * `hz` caps how often the value is published: the terminator is legible at 20 updates a second
 * and the map has a hundred and seventy country paths behind it, so redrawing it at display rate
 * buys nothing. The clock face asks for more, because it is one span.
 */
export function useSubHour(hz = 20): number {
  const tick = useGameStore((state) => state.view?.tick ?? 0);
  const speed = useGameStore((state) => state.view?.speed ?? 0);
  // A blocking event stops the host's clock without touching the speed, so the interpolation has
  // to stop with it or it would run on to the end of the hour and sit there.
  const blocked = useGameStore(
    (state) => state.view?.pending.some((choice) => choice.blocking) ?? false,
  );
  const reduced = usePrefersReducedMotion();
  const [phase, setPhase] = useState(0);
  const anchor = useRef({ tick, at: 0 });

  // Each tick restarts the phase: the hour the interpolation runs through is the new one.
  useEffect(() => {
    anchor.current = { tick, at: nowMs() };
    setPhase(0);
  }, [tick]);

  useEffect(() => {
    const rate = SPEED_HOURS_PER_SECOND[speed] ?? 0;
    if (reduced || blocked || rate <= 0 || typeof requestAnimationFrame !== "function") {
      setPhase(0);
      return;
    }
    const interval = 1000 / hz;
    let published = 0;
    let frame = requestAnimationFrame(function step(): void {
      const now = nowMs();
      if (now - published >= interval) {
        published = now;
        // Clamped, never wrapped: a late tick freezes the phase at the end of its hour instead of
        // sending the terminator back to where the hour started.
        setPhase(Math.min(MAX_PHASE, Math.max(0, ((now - anchor.current.at) / 1000) * rate)));
      }
      frame = requestAnimationFrame(step);
    });
    return () => cancelAnimationFrame(frame);
  }, [speed, reduced, blocked, hz]);

  return phase;
}

export interface ClockFace {
  hour: number;
  minute: number;
  second: number;
}

/** The game hour split into a clock face, with the minutes and seconds interpolated. */
export function clockFace(hour: number, subHour: number): ClockFace {
  const seconds = Math.floor(subHour * 3600);
  return {
    hour,
    minute: Math.floor(seconds / 60) % 60,
    second: seconds % 60,
  };
}
