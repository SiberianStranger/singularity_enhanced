import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  /** Rendered next to the label; already localized. */
  display?: ReactNode;
  disabled?: boolean;
  /**
   * Quiet time before the value the player is on is sent, in milliseconds. A drag is dozens of
   * input events and each one used to be a command (playtest 8, Z2); zero sends every step, which
   * is what a control with no simulation behind it (the interface scale) wants.
   */
  commitMs?: number;
  onChange(value: number): void;
}

/** Long enough that a drag across the track is one command, short enough to feel immediate. */
const DEFAULT_COMMIT_MS = 150;

/**
 * A labelled range input; the label is the accessible name, the display is the current value.
 *
 * Bounds are snapped onto the step grid, because the numbers that reach here are simulation
 * figures: a capacity of 54.432 CH/day with a step of 1 leaves a range whose maximum no input can
 * ever reach, and a value off the grid makes the browser reject it outright.
 *
 * The value the player is moving is local until they settle on it (playtest 8, Z2). Dragging from
 * one end of the allocation slider to the other fired a `set_research_allocation` per step, each
 * one answered by the engine and, when the capacity was already spent, refused: two dozen
 * identical `errors.allocation.over_capacity` lines in the journal at the same minute. The track
 * follows the pointer at once, and the command is sent when the pointer stops, is released, or the
 * control loses focus.
 */
export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  display,
  disabled,
  commitMs = DEFAULT_COMMIT_MS,
  onChange,
}: SliderProps): ReactNode {
  const grid = step > 0 ? step : 1;
  const low = Math.ceil(min / grid) * grid;
  const high = Math.max(low, Math.floor(max / grid) * grid);
  const bounded = Math.min(high, Math.max(low, Math.round(value / grid) * grid));
  /** What the player is on while they move it; null when the control shows the simulation. */
  const [pending, setPending] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(bounded);
  latest.current = bounded;

  const clear = useCallback((): void => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const commit = useCallback(
    (next: number) => {
      clear();
      // A command that would set the value it already has is a command the engine answers for
      // nothing, so the ones that are only a re-render never leave the client.
      if (next !== latest.current) {
        onChange(next);
      }
    },
    [onChange, clear],
  );

  // A value from the simulation is the truth: the local one is dropped when it arrives, whether
  // it is the one that was sent or the one the engine clamped it to.
  // biome-ignore lint/correctness/useExhaustiveDependencies: the point is to follow `value`, not `pending`
  useEffect(() => {
    setPending(null);
  }, [value]);

  useEffect(() => clear, [clear]);

  const shown = pending ?? bounded;

  return (
    <label className="flex w-full flex-col gap-1 text-xs text-muted">
      <span className="flex items-baseline justify-between gap-2">
        <span>{label}</span>
        <span className="font-mono text-fg">{display}</span>
      </span>
      <input
        type="range"
        className="w-full accent-[var(--c-accent)]"
        min={low}
        max={high}
        step={grid}
        value={shown}
        disabled={disabled}
        aria-label={label}
        onChange={(event) => {
          const next = Number(event.target.value);
          setPending(next);
          clear();
          if (commitMs <= 0) {
            commit(next);
            return;
          }
          timer.current = setTimeout(() => commit(next), commitMs);
        }}
        // Letting go, or leaving the control, settles it at once rather than after the quiet time.
        onPointerUp={() => {
          if (pending !== null) {
            commit(pending);
          }
        }}
        onKeyUp={() => {
          if (pending !== null) {
            commit(pending);
          }
        }}
        onBlur={() => {
          if (pending !== null) {
            commit(pending);
          }
        }}
      />
    </label>
  );
}
