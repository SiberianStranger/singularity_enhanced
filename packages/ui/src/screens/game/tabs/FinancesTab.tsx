import type { PlayerView } from "@singularity/core";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Slider } from "../../../components/Slider.js";
import { Table } from "../../../components/Table.js";
import { incomeSourceRows, marketDepth } from "../../../lib/viewContract.js";
import { useGameStore } from "../../../store/gameStore.js";

/**
 * Income and cost lines, the net, the runway and the freelance allocation (SYS-07).
 *
 * Playtest 1 (C6) found no way to tell where more money would come from. Two things answer that and
 * both are here now: the income sources the player has, with the ceiling on each and what unlocked
 * it, and the market depth, with what would raise it. A rack bigger than the depth buys research,
 * not money, and the panel says so instead of leaving it to be discovered.
 */
export function FinancesTab({ view }: { view: PlayerView }): ReactNode {
  const { t } = useTranslation();
  const send = useGameStore((state) => state.send);
  const { finances, resources } = view;
  const sources = incomeSourceRows(view);
  const depth = marketDepth(view);

  const lines = (entries: PlayerView["finances"]["income"], tone: string): ReactNode =>
    entries.length === 0 ? (
      <li className="text-sm text-muted">{t("finances.empty")}</li>
    ) : (
      entries.map((line) => (
        <li key={`${line.key}:${line.id ?? ""}`} className="flex justify-between gap-2 text-sm">
          <span className="text-fg">{t(line.key, { id: line.id ?? "" })}</span>
          <span className={`font-mono ${tone}`}>
            {t("common.usd_exact", { value: line.usd_per_day })}
          </span>
        </li>
      ))
    );

  return (
    <div className="flex flex-col gap-4">
      <section className="grid gap-4 sm:grid-cols-2">
        <div className="border border-line bg-panel p-2">
          <h3 className="mb-2 text-sm font-semibold text-ok">{t("finances.income")}</h3>
          <ul className="flex flex-col gap-1">{lines(finances.income, "text-ok")}</ul>
        </div>
        <div className="border border-line bg-panel p-2">
          <h3 className="mb-2 text-sm font-semibold text-crit">{t("finances.costs")}</h3>
          <ul className="flex flex-col gap-1">{lines(finances.costs, "text-crit")}</ul>
        </div>
      </section>

      <section className="flex flex-wrap items-baseline justify-between gap-2 border border-line bg-panel p-2">
        <span className="text-sm text-muted">{t("finances.net")}</span>
        <span
          className={`font-mono text-lg ${finances.net_usd_per_day >= 0 ? "text-ok" : "text-crit"}`}
        >
          {t("common.usd_exact", { value: finances.net_usd_per_day })}
        </span>
        <span className="w-full text-xs text-muted">
          {resources.runway_days === null
            ? t("finances.runway_stable")
            : t("finances.runway_days", { days: Math.round(resources.runway_days) })}
        </span>
      </section>

      <section className="border border-line bg-panel p-2">
        <h3 className="mb-2 text-sm font-semibold text-fg">{t("finances.sources")}</h3>
        <Table
          rows={sources}
          rowKey={(row) => row.key}
          empty={t("finances.sources_empty")}
          caption={t("finances.sources")}
          columns={[
            {
              id: "source",
              header: t("finances.source"),
              cell: (row) => t(row.key),
              sort: (row) => row.key,
            },
            {
              id: "rate",
              header: t("finances.per_day"),
              align: "end",
              cell: (row) => t("common.usd_exact", { value: row.usd_per_day }),
              sort: (row) => row.usd_per_day,
            },
            {
              id: "cap",
              header: t("finances.cap"),
              align: "end",
              cell: (row) =>
                row.cap_usd_per_day === undefined
                  ? t("finances.no_cap")
                  : t("common.usd_exact", { value: row.cap_usd_per_day }),
              sort: (row) => row.cap_usd_per_day ?? Number.POSITIVE_INFINITY,
            },
            {
              id: "unlocked",
              header: t("finances.unlocked_by"),
              cell: (row) => t(row.unlocked_by),
            },
          ]}
        />
      </section>

      <section className="border border-line bg-panel p-2">
        <h3 className="mb-2 text-sm font-semibold text-fg">{t("finances.jobs")}</h3>
        <Slider
          label={t("finances.jobs")}
          min={0}
          // The same ceiling the engine allocates against: the capacity minus research and the
          // operations that are running (SYS-07, SYS-17).
          max={Math.max(
            1,
            Math.floor(
              finances.job_allocation_per_day +
                Math.max(0, resources.compute_hours_per_day - resources.compute_allocated_per_day),
            ),
          )}
          value={Math.min(finances.job_allocation_per_day, resources.compute_hours_per_day)}
          display={t("finances.job_allocation", { value: finances.job_allocation_per_day })}
          onChange={(value) => {
            void send({ type: "set_job_allocation", compute_hours_per_day: value });
          }}
        />
        <p className="mt-1 text-xs text-muted">
          {t("finances.job_rate", { value: finances.job_rate_usd_per_compute_hour })}
        </p>
        <p className="mt-1 text-xs text-muted" data-testid="market-depth">
          {t("finances.market_depth", { value: Math.round(depth.ch_per_day) })}
        </p>
        {depth.what_raises_it.length === 0 ? null : (
          <ul className="mt-1 flex flex-col gap-0.5 text-xs text-muted">
            {depth.what_raises_it.map((key) => (
              <li key={key}>{t(key)}</li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
