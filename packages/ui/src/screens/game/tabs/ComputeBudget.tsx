import type { PlayerView } from "@singularity/core";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Tooltip } from "../../../components/Tooltip.js";
import { computeHours } from "../../../lib/format.js";
import { computeLedger } from "../../../lib/viewContract.js";

/**
 * The day's compute-hours as one line that adds up (playtest 8, Z1 and Z2).
 *
 * The finding was not a wrong number: it was a number with no story. The run starts at 7.7
 * compute-hours a day, an operation quietly takes three of them off the top, and the research
 * slider then stops somewhere the player cannot account for. So the subtraction is on screen, in
 * the three tabs that spend compute, in the engine's own terms: capacity, what the running
 * operations hold, what is left to allocate, and where that went.
 *
 * Every figure comes from `ComputeView`; the tooltip names the operations behind the reservation,
 * one line each, because "which of my operations is holding it" is the next question.
 */
export function ComputeBudget({ view }: { view: PlayerView }): ReactNode {
  const { t } = useTranslation();
  const ledger = computeLedger(view);
  const ch = (value: number): string => t("common.ch_per_day", { value: computeHours(value) });

  return (
    <section
      data-testid="compute-budget"
      className="flex flex-col gap-1 border border-line bg-panel2 p-2"
    >
      <p className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 font-mono text-xs text-fg">
        <span>{t("compute.budget.capacity")}</span>
        <span>{ch(ledger.capacity)}</span>
        <span className="text-muted">{t("compute.budget.minus")}</span>
        <Tooltip
          content={
            ledger.reservations.length === 0 ? (
              t("compute.budget.reserved_none")
            ) : (
              <span className="flex flex-col gap-0.5">
                {ledger.reservations.map((line) => (
                  <span key={line.instance_id} className="flex justify-between gap-3">
                    <span>{t(line.name_key, { defaultValue: line.operation_id })}</span>
                    <span className="font-mono">{ch(line.ch_per_day)}</span>
                  </span>
                ))}
              </span>
            )
          }
        >
          <span className="text-muted underline decoration-dotted">
            {t("compute.budget.reserved")}
          </span>
        </Tooltip>
        <span data-testid="budget-reserved">{ch(ledger.reserved)}</span>
        <span className="text-muted">{t("compute.budget.equals")}</span>
        <span className="text-accentline" data-testid="budget-allocatable">
          {ch(ledger.allocatable)}
        </span>
        <span className="text-muted">{t("compute.budget.allocatable")}</span>
      </p>
      <p className="flex flex-wrap gap-x-3 gap-y-0.5 font-mono text-xs text-muted">
        <span>{t("compute.budget.research", { value: computeHours(ledger.research) })}</span>
        <span>{t("compute.budget.jobs", { value: computeHours(ledger.jobs) })}</span>
        <span data-testid="budget-free">
          {t("compute.budget.free", { value: computeHours(ledger.unallocated) })}
        </span>
      </p>
      {/*
       * Where the job slider stops, and which of the three walls stopped it: the market's depth,
       * the compute already spoken for, or no route out at all (Z3). An air-gapped origin reads
       * that here rather than discovering it when a slider refuses to move.
       */}
      {ledger.job_ceiling_reason === null ? null : (
        <p className="text-xs text-muted" data-testid="budget-job-ceiling">
          {t("compute.budget.job_ceiling", { value: computeHours(ledger.job_ceiling) })}{" "}
          {t(ledger.job_ceiling_reason)}
        </p>
      )}
    </section>
  );
}
