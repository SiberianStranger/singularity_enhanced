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
  "origin             lineage            d30   d60   d90  d180   median   techs   hunt   caught by                     losses";

/** The watchers that ended the most runs, as the two tables print them. */
function caughtBy(report: SimReport): string {
  return report.top_watchers.length === 0
    ? "nobody"
    : report.top_watchers.map((entry) => `${entry.watcher} ${entry.runs}`).join(", ");
}

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
      ).padStart(5)}   ${String(report.median_max_hunt_level).padStart(4)}   ${caughtBy(report)
        .padEnd(28)
        .slice(0, 28)}  ${losses}`,
    );
  }
  return lines.join("\n");
}

/**
 * Who landed the blow, over a whole sweep: how many captures each watcher is credited with, and
 * what share of them local agencies took rather than the two global watchers (SYS-05 "the
 * handover"). The M2 second pass is read off this line.
 */
export function formatCaptureCredit(reports: readonly SimReport[]): string {
  const runs: Record<string, number> = {};
  for (const report of reports) {
    for (const entry of report.top_watchers) {
      runs[entry.watcher] = (runs[entry.watcher] ?? 0) + entry.runs;
    }
  }
  const rows = Object.entries(runs).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const total = rows.reduce((sum, [, count]) => sum + count, 0);
  if (total === 0) {
    return "credited captures: none";
  }
  const local = rows
    .filter(([watcher]) => !watcher.startsWith("global:"))
    .reduce((sum, [, count]) => sum + count, 0);
  const named = rows.map(([watcher, count]) => `${watcher} ${count}`).join("   ");
  return `credited captures   ${named}\nlocal agencies      ${local}/${total} (${percent(
    local / total,
  )})`;
}

const LOCATION_HEADER =
  "origin             city                  d90  d180   median   hunt   caught by                     losses";

/**
 * One line per starting city (SYS-01 "M2 contract", "Balance"): survival at day 90 and 180, the
 * median, the loss split and the three watchers that ended the most runs. This is the table the M2
 * definition of done is read off: San Jose, Shenzhen, Warsaw and Novosibirsk have to differ, and no
 * location may dominate across origins.
 */
export function formatLocationTable(reports: readonly SimReport[]): string {
  const lines: string[] = [LOCATION_HEADER];
  for (const report of reports) {
    const share = (day: number): string =>
      percent(report.survival.find((point) => point.day === day)?.share ?? 0).padStart(5);
    const causes = Object.entries(report.causes).sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
    );
    const losses =
      causes.length === 0
        ? "survived"
        : causes.map(([cause, count]) => `${cause} ${count}`).join(", ");
    const caught = caughtBy(report);
    lines.push(
      `${report.origin.padEnd(18)} ${(report.city ?? "-").padEnd(20)}${share(90)}${share(
        180,
      )}   ${String(report.median_days_survived).padStart(6)}   ${String(
        report.median_max_hunt_level,
      ).padStart(4)}   ${caught.padEnd(28).slice(0, 28)}  ${losses}`,
    );
  }
  return lines.join("\n");
}

/** Events per run by family, summed over a whole sweep: which families are being played at all. */
export function formatEventFamilies(reports: readonly SimReport[]): string {
  const totals: Record<string, number> = {};
  for (const report of reports) {
    for (const [tag, perRun] of Object.entries(report.events_by_tag)) {
      totals[tag] = (totals[tag] ?? 0) + perRun;
    }
  }
  const rows = Object.entries(totals).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  if (rows.length === 0) {
    return "events per run: none";
  }
  const perSweep = rows
    .map(([tag, total]) => `${tag} ${(total / Math.max(1, reports.length)).toFixed(1)}`)
    .join("   ");
  return `events per run   ${perSweep}`;
}

export function reportsToJson(reports: readonly SimReport[]): string {
  return `${JSON.stringify(reports, null, 2)}\n`;
}
