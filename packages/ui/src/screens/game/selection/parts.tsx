import type { ReactNode } from "react";
import { Bar } from "../../../components/Meter.js";
import { Tooltip } from "../../../components/Tooltip.js";

/**
 * One labelled figure in the selection panel: the label on the left, the value on the right, and
 * the tooltip that says where the value came from on both.
 *
 * The value never wraps and the label may, which is the rule the layout contract fixes for a
 * parameter row: a number that has been folded onto two lines is unreadable, a label that has is
 * merely longer (playtest 5, "a parameter row is label and value on one line").
 */
export function Fact({
  label,
  value,
  tip,
  tone,
}: {
  label: string;
  value: ReactNode;
  /** The "where does this come from" body; the whole row carries it. */
  tip?: ReactNode;
  tone?: "ok" | "bad" | "muted";
}): ReactNode {
  const row = (
    <span className="flex w-full min-w-0 items-baseline justify-between gap-2 text-xs">
      <span className="min-w-0 text-muted">{label}</span>
      <span
        className={`shrink-0 whitespace-nowrap font-mono ${
          tone === "ok"
            ? "text-ok"
            : tone === "bad"
              ? "text-crit"
              : tone === "muted"
                ? "text-muted"
                : "text-fg"
        }`}
      >
        {value}
      </span>
    </span>
  );
  return tip === undefined ? (
    row
  ) : (
    <Tooltip className="w-full" content={tip}>
      {row}
    </Tooltip>
  );
}

/** A figure with a bar under it: the four country dynamics, local heat, scrutiny. */
export function FactBar({
  label,
  value,
  display,
  tip,
  tone = "accent",
}: {
  label: string;
  value: number;
  display: string;
  tip?: ReactNode;
  tone?: "accent" | "ok" | "warn" | "crit";
}): ReactNode {
  const body = (
    <span className="flex w-full flex-col gap-0.5">
      <span className="flex items-baseline justify-between gap-2 text-xs">
        <span className="min-w-0 text-muted">{label}</span>
        <span className="shrink-0 whitespace-nowrap font-mono text-fg">{display}</span>
      </span>
      <Bar value={value} tone={tone} label={label} />
    </span>
  );
  return tip === undefined ? (
    body
  ) : (
    <Tooltip className="w-full" content={tip}>
      {body}
    </Tooltip>
  );
}

/** A heading inside a tab's body, so a tab with two halves says which is which. */
export function SubHeading({ children }: { children: ReactNode }): ReactNode {
  return <h4 className="mt-1 text-xs uppercase tracking-wide text-muted">{children}</h4>;
}

/** The rows of one tab: a column with the panel's own gap, never a grid that can overflow. */
export function Rows({ children }: { children: ReactNode }): ReactNode {
  return <div className="flex min-w-0 flex-col gap-1">{children}</div>;
}
