import type { ReactNode } from "react";
import { clamp01 } from "../lib/format.js";
import { Tooltip } from "./Tooltip.js";

type Tone = "accent" | "ok" | "warn" | "crit" | "info" | "opp";

const TONES: Record<Tone, string> = {
  accent: "bg-accent",
  ok: "bg-ok",
  warn: "bg-warn",
  crit: "bg-crit",
  info: "bg-info",
  opp: "bg-opp",
};

interface BarProps {
  value: number;
  tone?: Tone;
  className?: string;
  label?: string;
}

/** A 0..1 bar. `label` is the accessible name; the caller localizes it. */
export function Bar({ value, tone = "accent", className, label }: BarProps): ReactNode {
  const percent = clamp01(value) * 100;
  return (
    <span className={`block h-1.5 w-full overflow-hidden bg-panel2 ${className ?? ""}`}>
      <meter className="sr-only" value={Math.round(percent)} min={0} max={100} aria-label={label} />
      <span
        aria-hidden="true"
        className={`block h-full ${TONES[tone]}`}
        style={{ inlineSize: `${percent}%` }}
      />
    </span>
  );
}

interface IndicatorProps {
  label: string;
  value: ReactNode;
  /** Contributing values, shown in the tooltip (Paradox-style breakdown). */
  breakdown?: ReactNode;
  meter?: number;
  tone?: Tone;
  trend?: number;
  onClick?: () => void;
}

/**
 * One cell of the top bar: label, value, optional bar, tooltip breakdown.
 *
 * Everything is on one line (playtest 3, R11). Stacking the label over the value doubled the height
 * of the bar for eight indicators, which is what made it "too thick"; side by side the same eight
 * fit in one flat row, and the gauge is a short bar next to its value rather than a third line.
 */
export function Indicator({
  label,
  value,
  breakdown,
  meter,
  tone = "accent",
  trend,
  onClick,
}: IndicatorProps): ReactNode {
  const body = (
    <span className="flex items-center gap-1.5 whitespace-nowrap px-2 py-0.5 text-start">
      <span className="text-xs uppercase tracking-wide text-muted">{label}</span>
      <span className="flex items-baseline gap-1 font-mono text-sm text-fg">
        {value}
        {trend !== undefined && trend !== 0 ? (
          <span className={trend > 0 ? "text-ok" : "text-crit"} aria-hidden="true">
            {trend > 0 ? "▲" : "▼"}
          </span>
        ) : null}
      </span>
      {meter === undefined ? null : (
        <Bar value={meter} tone={tone} label={label} className="w-10" />
      )}
    </span>
  );
  const inner =
    onClick === undefined ? (
      body
    ) : (
      <button type="button" onClick={onClick} className="hover:bg-panel2">
        {body}
      </button>
    );
  return breakdown === undefined ? inner : <Tooltip content={breakdown}>{inner}</Tooltip>;
}
