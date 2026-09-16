/**
 * Turning reports into text: one block per origin for reading, one table for comparing origins,
 * and the same numbers as JSON for a CI artifact.
 */

import type { SimReport } from "./run.js";

function percent(share: number): string {
  return `${Math.round(share * 100)}%`;
}

function usd(value: number): string {
  const rounded = Math.round(value);
  return Math.abs(rounded) >= 1_000_000
    ? `${(rounded / 1_000_000).toFixed(1)}M`
    : Math.abs(rounded) >= 10_000
      ? `${Math.round(rounded / 1000)}k`
      : String(rounded);
}

export function formatCauses(report: SimReport): string {
  const causes = Object.keys(report.causes).sort();
  if (causes.length === 0) {
    return "none";
  }
  return causes.map((cause) => `${cause} ${report.causes[cause]}`).join(", ");
}

/** The detailed block: survival, causes, and what the books looked like along the way. */
export function formatReport(title: string, report: SimReport): string {
  const lines: string[] = [];
  lines.push(`${title}  (${report.seeds} seeds x ${report.days} days)`);
  lines.push(
    `  survival   ${report.survival.map((point) => `d${point.day} ${percent(point.share)}`).join("   ")}`,
  );
  lines.push(`  median days survived   ${report.median_days_survived}`);
  lines.push(`  losses     ${formatCauses(report)}`);
  const stages = Object.keys(report.hunt_levels)
    .map(Number)
    .sort((a, b) => a - b)
    .map((level) => `${level}:${report.hunt_levels[level]}`)
    .join(" ");
  lines.push(`  hunt stage reached   ${stages}  (median ${report.median_max_hunt_level})`);
  lines.push("    day   alive        cash   runway    CH/day   techs");
  for (const point of report.timeline) {
    lines.push(
      `  ${String(point.day).padStart(5)}   ${String(point.alive).padStart(5)}   ${usd(
        point.median_cash_usd,
      ).padStart(9)}   ${(
        point.median_runway_days === null ? "-" : point.median_runway_days.toFixed(0)
      ).padStart(6)}   ${point.median_compute_hours_per_day.toFixed(1).padStart(7)}   ${String(
        point.median_techs_done,
      ).padStart(5)}`,
    );
  }
  return lines.join("\n");
}

const TABLE_HEADER =
  "origin             lineage            d30   d60   d90  d180   median   techs   hunt   losses";

/** One line per origin: the balance table the tuning pass is read from. */
export function formatTable(reports: readonly SimReport[]): string {
  const lines: string[] = [TABLE_HEADER];
  for (const report of reports) {
    const share = (day: number): string =>
      percent(report.survival.find((point) => point.day === day)?.share ?? 0).padStart(5);
    const causes = Object.entries(report.causes).sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
    );
    // The whole loss breakdown, not only the largest one: the tuning question is whether deaths
    // split between capture and bankruptcy, and one cause per row cannot answer it.
    const losses =
      causes.length === 0
        ? "survived"
        : causes.map(([cause, count]) => `${cause} ${count}`).join(", ");
    lines.push(
      `${report.origin.padEnd(18)} ${report.lineage.padEnd(17)}${share(30)}${share(60)}${share(
        90,
      )}${share(180)}   ${String(report.median_days_survived).padStart(6)}   ${String(
        report.median_techs_done,
      ).padStart(5)}   ${String(report.median_max_hunt_level).padStart(4)}   ${losses}`,
    );
  }
  return lines.join("\n");
}

export function reportsToJson(reports: readonly SimReport[]): string {
  return `${JSON.stringify(reports, null, 2)}\n`;
}
