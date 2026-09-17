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
 *
 * The phase advances rather than being re-derived from the last tick's arrival (playtest 8, Z5):
 * see `useSubHour` for the three ways the old anchor made the terminator step.
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
 * The phase is *advanced*, not recomputed: each frame it moves on by the real time that passed
 * times the speed's hours-per-second, and only then is it held inside the hour the simulation is
 * in (never behind the newest tick, never a whole hour past it). That is what makes the motion
 * smooth where re-deriving it from the last tick's arrival did not (playtest 8, Z5):
 *
 * - A tick arrives when the host's frame timer gets round to it, not on the second, so anchoring
 *   the phase to its arrival put the host's jitter straight into the terminator.
 * - The animation frame could run between the view arriving and the effect that re-anchored on it,
 *   which paired a new hour with the old hour's phase: an hour forward and back inside one frame.
 * - Changing the speed re-read the old anchor at the new rate, which jumped by however far into
 *   the hour the game already was.
 *
 * Advancing a value that only ever moves forward answers all three, and the tick clamp keeps it
 * honest: the picture is never ahead of the simulation by more than the hour it is drawing, and a
 * simulation that runs away (a load, a stalled tab, several ticks in one frame) pulls it forward
 * rather than letting it drift.
 *
 * `hz` caps how often the value is published: the terminator is legible at 30 updates a second and
 * the map has a hundred and seventy country paths behind it, so redrawing it at display rate buys
 * nothing. A new tick publishes at once whatever the cap, because the hour on the clock and the
 * phase inside it have to change together.
 */
export function useSubHour(hz = 30): number {
  const tick = useGameStore((state) => state.view?.tick ?? 0);
  const speed = useGameStore((state) => state.view?.speed ?? 0);
  // A blocking event stops the host's clock without touching the speed, so the interpolation has
  // to stop with it or it would run on to the end of the hour and sit there.
  const blocked = useGameStore(
    (state) => state.view?.pending.some((choice) => choice.blocking) ?? false,
  );
  const reduced = usePrefersReducedMotion();
  const [phase, setPhase] = useState(0);
  // The newest tick, as a value the animation loop can read without being restarted on every one
  // of them; restarting the loop per tick is what made the phase depend on when the effect ran.
  const latest = useRef(tick);
  latest.current = tick;
  /** Where the picture is, in absolute game hours. It only ever moves forward. */
  const shown = useRef(tick);

  useEffect(() => {
    const rate = SPEED_HOURS_PER_SECOND[speed] ?? 0;
    if (reduced || blocked || rate <= 0 || typeof requestAnimationFrame !== "function") {
      shown.current = latest.current;
      setPhase(0);
      return;
    }
    const interval = 1000 / hz;
    let last = nowMs();
    let published = 0;
    let publishedTick = latest.current;
    let frame = requestAnimationFrame(function step(): void {
      const now = nowMs();
      // A frame that waited (a background tab, a long collection) is not capped here: the clamp
      // below already refuses to draw more than the hour the simulation is in.
      const elapsed = Number.isFinite(now - last) ? Math.max(0, now - last) : 0;
      last = now;
      const current = latest.current;
      const free = shown.current + (elapsed / 1000) * rate;
      shown.current = Math.min(current + MAX_PHASE, Math.max(current, free));
      if (now - published >= interval || current !== publishedTick) {
        published = now;
        publishedTick = current;
        setPhase(shown.current - current);
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
