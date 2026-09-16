import type { PlayerView } from "@singularity/core";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Slider } from "../../../components/Slider.js";
import { useGameStore } from "../../../store/gameStore.js";

/** Income and cost lines, the net, the runway and the freelance allocation (SYS-07). */
export function FinancesTab({ view }: { view: PlayerView }): ReactNode {
  const { t } = useTranslation();
  const send = useGameStore((state) => state.send);
  const { finances, resources } = view;

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
        <div className="rounded border border-line bg-panel p-3">
          <h3 className="mb-2 text-sm font-semibold text-ok">{t("finances.income")}</h3>
          <ul className="flex flex-col gap-1">{lines(finances.income, "text-ok")}</ul>
        </div>
        <div className="rounded border border-line bg-panel p-3">
          <h3 className="mb-2 text-sm font-semibold text-crit">{t("finances.costs")}</h3>
          <ul className="flex flex-col gap-1">{lines(finances.costs, "text-crit")}</ul>
        </div>
      </section>

      <section className="flex flex-wrap items-baseline justify-between gap-2 rounded border border-line bg-panel p-3">
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

      <section className="rounded border border-line bg-panel p-3">
        <h3 className="mb-2 text-sm font-semibold text-fg">{t("finances.jobs")}</h3>
        <Slider
          label={t("finances.jobs")}
          min={0}
          max={Math.max(1, resources.compute_hours_per_day)}
          value={Math.min(finances.job_allocation_per_day, resources.compute_hours_per_day)}
          display={t("finances.job_allocation", { value: finances.job_allocation_per_day })}
          onChange={(value) => {
            void send({ type: "set_job_allocation", compute_hours_per_day: value });
          }}
        />
        <p className="mt-1 text-xs text-muted">
          {t("finances.job_rate", { value: finances.job_rate_usd_per_compute_hour })}
        </p>
      </section>
    </div>
  );
}
