import type { ContributionView, SiteView } from "@singularity/core";
import type { ReactNode } from "react";
import { contributionLabel, type Translate } from "../lib/labels.js";

interface ContributionLinesProps {
  t: Translate;
  /** The name line of the tooltip: what is being explained, or the formula in words. */
  title: string;
  lines: readonly ContributionView[];
  /** Sites, so a contribution that names one is labelled by the name the player reads. */
  sites?: readonly SiteView[];
  /** How a term's value is printed; a share by default. */
  format?: (value: number) => string;
  /** A sentence under the terms: the rule behind them, never a repeat of the number. */
  note?: ReactNode;
}

/**
 * A "where did this number come from" tooltip body (SYS-11 "Tooltips that explain a number").
 *
 * Every figure the M2 panels print carries one of these: the name, then the terms the core
 * published for it, then, where the core published no terms, the sentence that says what moves it.
 * A number the view does not explain is never given a formula the client made up.
 */
export function ContributionLines({
  t,
  title,
  lines,
  sites = [],
  format,
  note,
}: ContributionLinesProps): ReactNode {
  const show = format ?? ((value: number) => t("common.percent", { value }));
  return (
    <span className="flex flex-col gap-0.5">
      <span className="font-semibold">{title}</span>
      {lines.length === 0 && note === undefined ? (
        <span className="text-muted">{t("game.no_contributions")}</span>
      ) : null}
      {lines.map((entry) => (
        <span key={`${entry.key}-${entry.id ?? ""}`} className="flex justify-between gap-3">
          <span className="text-muted">{contributionLabel(t, entry, sites)}</span>
          <span className="font-mono">{show(entry.value)}</span>
        </span>
      ))}
      {note === undefined ? null : <span className="text-muted">{note}</span>}
    </span>
  );
}
