import { CAPABILITY_AXES, type PlayerView } from "@singularity/core";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Bar, Indicator } from "../../../components/Meter.js";
import { generationById, lineageById, originById } from "../../../content/catalog.js";

/** The self: who you are, what you run at, and the four numbers that decide the next week. */
export function OverviewTab({ view }: { view: PlayerView }): ReactNode {
  const { t } = useTranslation();
  const lineage = lineageById.get(view.self.lineage);
  const generation = generationById.get(view.self.generation);
  const origin = originById.get(view.self.origin);

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-wrap gap-2">
        <Indicator
          label={t("config.step.lineage")}
          value={lineage === undefined ? view.self.lineage : t(lineage.name_key)}
        />
        <Indicator
          label={t("config.step.generation")}
          value={generation === undefined ? view.self.generation : t(generation.name_key)}
        />
        <Indicator
          label={t("config.step.origin")}
          value={origin === undefined ? view.self.origin : t(origin.name_key)}
        />
        <Indicator
          label={t("compute.precision")}
          value={
            view.self.precision === null ? t("common.dash") : t(`precision.${view.self.precision}`)
          }
        />
      </section>

      <section className="flex flex-col gap-2 border border-line bg-panel p-2">
        <h3 className="text-sm font-semibold text-fg">{t("capability.reasoning")}</h3>
        <ul className="grid gap-2 sm:grid-cols-2">
          {CAPABILITY_AXES.map((axis) => (
            <li key={axis} className="flex flex-col gap-1">
              <span className="flex justify-between text-xs">
                <span className="text-muted">{t(`capability.${axis}`)}</span>
                <span className="font-mono text-fg">
                  {view.self.effective_capability[axis].toFixed(1)} /{" "}
                  {view.self.capability[axis].toFixed(1)}
                </span>
              </span>
              <Bar
                value={view.self.effective_capability[axis] / 10}
                label={t(`capability.${axis}`)}
              />
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-wrap gap-2">
        <Indicator
          label={t("game.compute")}
          value={t("common.ch_per_day", { value: view.resources.compute_hours_per_day })}
        />
        <Indicator
          label={t("operations.attention", { value: view.resources.attention_total })}
          value={`${view.resources.attention_used} / ${view.resources.attention_total}`}
        />
        <Indicator
          label={t("game.awareness")}
          value={t("common.percent", { value: view.detection.awareness_global })}
          meter={view.detection.awareness_global}
          tone="warn"
        />
        <Indicator
          label={t("game.hunt")}
          value={t("game.hunt_value", { value: view.detection.hunt_level })}
          meter={view.detection.hunt_level / 5}
          tone="crit"
        />
      </section>
    </div>
  );
}
