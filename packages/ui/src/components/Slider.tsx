import type { ReactNode } from "react";

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  /** Rendered next to the label; already localized. */
  display?: ReactNode;
  disabled?: boolean;
  onChange(value: number): void;
}

/**
 * A labelled range input; the label is the accessible name, the display is the current value.
 *
 * Bounds are snapped onto the step grid, because the numbers that reach here are simulation
 * figures: a capacity of 54.432 CH/day with a step of 1 leaves a range whose maximum no input can
 * ever reach, and a value off the grid makes the browser reject it outright.
 */
export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  display,
  disabled,
  onChange,
}: SliderProps): ReactNode {
  const grid = step > 0 ? step : 1;
  const low = Math.ceil(min / grid) * grid;
  const high = Math.max(low, Math.floor(max / grid) * grid);
  const current = Math.min(high, Math.max(low, Math.round(value / grid) * grid));

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
        value={current}
        disabled={disabled}
        aria-label={label}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}
