import type { PlayerView, TechStatus, TechView } from "@singularity/core";
import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../components/Button.js";
import { EffectList } from "../../../components/EffectList.js";
import { Bar } from "../../../components/Meter.js";
import { Slider } from "../../../components/Slider.js";
import { Tooltip } from "../../../components/Tooltip.js";
import { days } from "../../../lib/format.js";
import {
  computeLedger,
  entityNameKey,
  researchCeiling,
  techRows,
} from "../../../lib/viewContract.js";
import { useGameStore } from "../../../store/gameStore.js";
import { ComputeBudget } from "./ComputeBudget.js";

/** Filters, in strip order. "available" is on by default, which is the fix for playtest 1 U2. */
const FILTERS: readonly TechStatus[] = ["available", "in_progress", "done", "locked"];
const SORTS = ["cost", "tier", "branch", "name"] as const;
type Sort = (typeof SORTS)[number];

const STATUS_ORDER: Record<TechStatus, number> = {
  in_progress: 0,
  available: 1,
  done: 2,
  locked: 3,
};

function comparator(sort: Sort, name: (tech: TechView) => string) {
  return (a: TechView, b: TechView): number => {
    const byStatus = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    if (byStatus !== 0) {
      return byStatus;
    }
    switch (sort) {
      case "cost":
        return a.cost_ch - b.cost_ch;
      case "tier":
        return a.tier - b.tier || a.cost_ch - b.cost_ch;
      case "branch":
        return a.branch.localeCompare(b.branch) || a.tier - b.tier;
      default:
        return name(a).localeCompare(name(b));
    }
  };
}

/**
 * The research list (SYS-12), filtered and sorted.
 *
 * Playtest 1 found every tech in the bundle listed at once, unavailable ones included, with no
 * order and no way to narrow it: seventy-odd rows to scroll through. The default is now the techs
 * that can actually be started, with the other three states one click away, and every row says what
 * it costs, the soonest it can finish, what it needs, what it opens and what it does.
 */
export function ResearchTab({ view }: { view: PlayerView }): ReactNode {
  const { t } = useTranslation();
  const send = useGameStore((state) => state.send);
  const [shown, setShown] = useState<readonly TechStatus[]>(["available", "in_progress"]);
  const [sort, setSort] = useState<Sort>("cost");

  const techs = techRows(view);
  const ledger = computeLedger(view);

  // Filtering and sorting seventy-odd rows is not worth memoizing, and the list is rebuilt from
  // the view on every render anyway.
  const name = (tech: TechView): string => t(tech.name_key);
  const ceiling = (allocation: number): number => researchCeiling(ledger, allocation);
  const rows = techs.filter((tech) => shown.includes(tech.status)).sort(comparator(sort, name));

  const toggle = (status: TechStatus): void => {
    setShown((current) =>
      current.includes(status) ? current.filter((entry) => entry !== status) : [...current, status],
    );
  };

  return (
    <div className="flex flex-col gap-2">
      {/*
       * The same subtraction the Compute tab opens with, because this is where it is spent
       * (playtest 8, Z1). It replaces the old "X of Y CH/day allocated" line, which said one term
       * of it and left the operations out, which is what made the ceiling unaccountable.
       */}
      <ComputeBudget view={view} />

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs uppercase tracking-wide text-muted">{t("research.show")}</span>
        {FILTERS.map((status) => (
          <Button
            key={status}
            variant={shown.includes(status) ? "primary" : "ghost"}
            aria-pressed={shown.includes(status)}
            onClick={() => toggle(status)}
          >
            {t(`research.status.${status}`)}
          </Button>
        ))}
        <label className="ms-auto flex items-center gap-1 text-xs text-muted">
          {t("research.sort")}
          <select
            className="border border-line bg-panel2 px-2 py-1 text-sm text-fg"
            value={sort}
            onChange={(event) => setSort(event.target.value as Sort)}
          >
            {SORTS.map((entry) => (
              <option key={entry} value={entry}>
                {t(`research.sort.${entry}`)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {rows.length === 0 ? <p className="text-sm text-muted">{t("research.empty")}</p> : null}

      <ul className="flex flex-col gap-2">
        {rows.map((tech) => (
          <li
            key={tech.id}
            data-testid={`tech-${tech.id}`}
            className="flex flex-col gap-1 border border-line bg-panel p-2"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <Tooltip content={t(tech.desc_key)}>
                <span className="text-sm text-fg">{t(tech.name_key)}</span>
              </Tooltip>
              <span className="flex items-center gap-2 font-mono text-xs text-muted">
                <span>{t(`research.status.${tech.status}`)}</span>
                <span>{t(`research.branch.${tech.branch}`, { defaultValue: tech.branch })}</span>
                <span>{t("research.tier", { tier: tech.tier })}</span>
              </span>
            </div>

            <div className="flex flex-wrap gap-x-3 gap-y-0.5 font-mono text-xs text-muted">
              <span>{t("research.cost", { compute: tech.cost_ch, cash: tech.cost_cash_usd })}</span>
              {tech.min_days > 0 ? (
                <span>{t("research.min_days", { days: tech.min_days })}</span>
              ) : null}
              {tech.danger > 0 ? <span>{t("research.danger", { value: tech.danger })}</span> : null}
            </div>

            {tech.status === "done" ? (
              tech.result_key === undefined ? null : (
                <p data-testid="tech-result" className="text-xs text-ok">
                  {t(tech.result_key)}
                </p>
              )
            ) : (
              <>
                {tech.requires.length === 0 ? null : (
                  <p className="text-xs text-muted">
                    {t("research.requires")}{" "}
                    {tech.requires.map((id) => t(entityNameKey(id))).join(", ")}
                  </p>
                )}
                {tech.unlocks.length === 0 ? null : (
                  <p className="text-xs text-muted">
                    {t("research.unlocks")}{" "}
                    {tech.unlocks.map((id) => t(entityNameKey(id))).join(", ")}
                  </p>
                )}
                <EffectList effects={tech.effects} title={t("research.effects")} />
              </>
            )}

            {/*
             * Two bars, never one (playtest 8, Z7 and Z14). The compute bar is the hours that have
             * landed against the hours it costs; the cash bar is what has been paid against what it
             * costs, because the money follows the hours and a large figure in the Finances panel
             * is today's rate, not a bill that repeats until the technology lands. A finished
             * technology has neither: a full bar on a done row read as "stuck at the end".
             */}
            {tech.status !== "done" && (tech.status === "in_progress" || tech.progress > 0) ? (
              <div className="my-1 flex flex-col gap-1">
                <span className="flex items-center gap-2">
                  <span className="w-28 shrink-0 font-mono text-xs text-muted">
                    {t("research.compute_bar", {
                      done: Math.round(tech.compute_hours_done ?? tech.progress * tech.cost_ch),
                      total: tech.cost_ch,
                    })}
                  </span>
                  <Bar
                    className="min-w-0 flex-1"
                    value={tech.progress}
                    label={t("research.compute_bar", {
                      done: Math.round(tech.compute_hours_done ?? 0),
                      total: tech.cost_ch,
                    })}
                  />
                </span>
                {tech.cost_cash_usd > 0 ? (
                  <span className="flex items-center gap-2" data-testid={`tech-cash-${tech.id}`}>
                    <span className="w-28 shrink-0 font-mono text-xs text-muted">
                      {t("research.cash_bar", {
                        paid: tech.cash_paid_usd ?? 0,
                        total: tech.cost_cash_usd,
                      })}
                    </span>
                    <Tooltip content={t("research.cash_hint")}>
                      <Bar
                        className="min-w-0 flex-1"
                        tone="warn"
                        value={(tech.cash_paid_usd ?? 0) / tech.cost_cash_usd}
                        label={t("research.cash_bar", {
                          paid: tech.cash_paid_usd ?? 0,
                          total: tech.cost_cash_usd,
                        })}
                      />
                    </Tooltip>
                  </span>
                ) : null}
              </div>
            ) : null}

            {tech.status === "available" || tech.status === "in_progress" ? (
              <div className="flex flex-wrap items-center gap-3">
                <span className="min-w-40 flex-1">
                  <Slider
                    label={t("research.allocation")}
                    min={0}
                    /*
                     * Where the engine stops, and not one hour further (playtest 8, Z2): what this
                     * line already holds plus what nothing holds, floored. The old ceiling was
                     * `max(1, ...)`, so a rack whose every hour was already spoken for still
                     * offered an hour, and every step of the drag that followed was refused.
                     */
                    max={ceiling(tech.allocation_per_day)}
                    disabled={ceiling(tech.allocation_per_day) === 0}
                    value={tech.allocation_per_day}
                    display={t("common.ch_per_day", { value: tech.allocation_per_day })}
                    onChange={(value) => {
                      void send({
                        type: "set_research_allocation",
                        techId: tech.id,
                        compute_hours_per_day: value,
                      });
                    }}
                  />
                </span>
                <span className="font-mono text-xs text-muted">
                  {tech.eta_days === null
                    ? t("research.eta_none")
                    : t("research.eta", { days: days(tech.eta_days) })}
                </span>
                {ceiling(tech.allocation_per_day) === 0 ? (
                  <span className="w-full text-xs text-warn" data-testid="research-ceiling">
                    {t("compute.ceiling.none")}
                  </span>
                ) : null}
              </div>
            ) : tech.status === "locked" ? (
              <p className="text-xs text-warn">
                {t("research.blocked")}{" "}
                {tech.blocked_by.length > 0
                  ? tech.blocked_by.map((key) => t(key)).join(", ")
                  : t(tech.blocked_reason ?? "requirements.unknown")}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
