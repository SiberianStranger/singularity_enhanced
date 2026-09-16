import type { PlayerView, TechView } from "@singularity/core";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Bar } from "../../../components/Meter.js";
import { Slider } from "../../../components/Slider.js";
import { Tooltip } from "../../../components/Tooltip.js";
import { useGameStore } from "../../../store/gameStore.js";

/** Techs grouped by branch, with allocation sliders that respect the total (SYS-12). */
export function ResearchTab({ view }: { view: PlayerView }): ReactNode {
  const { t } = useTranslation();
  const send = useGameStore((state) => state.send);
  const techs = [...view.research.in_progress, ...view.research.available];
  const allocated = techs.reduce((sum, tech) => sum + tech.allocation_per_day, 0);
  const total = view.resources.compute_hours_per_day;
  const free = Math.max(0, total - view.finances.job_allocation_per_day - allocated);

  const byBranch = new Map<string, TechView[]>();
  for (const tech of techs) {
    byBranch.set(tech.branch, [...(byBranch.get(tech.branch) ?? []), tech]);
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="font-mono text-sm text-fg">
        {t("research.total", { used: Math.round(allocated), total: Math.round(total) })}
      </p>
      {techs.length === 0 ? <p className="text-sm text-muted">{t("research.empty")}</p> : null}
      {[...byBranch.entries()].map(([branch, entries]) => (
        <section key={branch} className="flex flex-col gap-2">
          <h3 className="text-xs uppercase tracking-wide text-muted">{branch}</h3>
          <ul className="flex flex-col gap-2">
            {entries.map((tech) => (
              <li key={tech.id} className="rounded border border-line bg-panel p-2">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <Tooltip content={t(`techs.${tech.id}.desc`)}>
                    <span className="text-sm text-fg">{t(`techs.${tech.id}.name`)}</span>
                  </Tooltip>
                  <span className="font-mono text-xs text-muted">
                    {t("research.cost", {
                      compute: tech.cost_compute_hours,
                      cash: tech.cost_cash_usd,
                    })}
                    {tech.danger > 0 ? ` - ${t("research.danger", { value: tech.danger })}` : ""}
                  </span>
                </div>
                <Bar value={tech.progress} className="my-1" label={t(`techs.${tech.id}.name`)} />
                {tech.available ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="min-w-40 flex-1">
                      <Slider
                        label={t("research.allocation")}
                        min={0}
                        max={Math.max(1, Math.round(tech.allocation_per_day + free))}
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
                        : t("research.eta", { days: tech.eta_days })}
                    </span>
                  </div>
                ) : (
                  <p className="text-xs text-warn">
                    {t("research.blocked")} {tech.blocked_by.map((key) => t(key)).join(", ")}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
      {view.research.done.length === 0 ? null : (
        <section>
          <h3 className="text-xs uppercase tracking-wide text-muted">{t("research.done")}</h3>
          <ul className="flex flex-wrap gap-2 text-sm text-muted">
            {view.research.done.map((id) => (
              <li key={id}>{t(`techs.${id}.name`)}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
