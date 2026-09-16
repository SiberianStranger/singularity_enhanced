import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "../../../components/Card.js";
import {
  fitHardware,
  generationById,
  lineageById,
  originById,
  presetsOfOrigin,
} from "../../../content/catalog.js";
import { useConfigurator } from "../store.js";

export function HardwareStep(): ReactNode {
  const { t } = useTranslation();
  const draft = useConfigurator((state) => state.draft);
  const set = useConfigurator((state) => state.set);
  const origin = originById.get(draft.origin);
  const lineage = lineageById.get(draft.lineage);
  const generation = generationById.get(draft.generation);
  const presets = presetsOfOrigin(origin);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">{t("config.hardware.intro")}</p>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {presets.map((preset) => {
          const fit = lineage === undefined ? null : fitHardware(preset, lineage, generation);
          return (
            <Card
              key={preset.id}
              title={t(preset.name_key)}
              subtitle={t(`class.${preset.class}`)}
              selected={preset.id === draft.hardware}
              onSelect={() => set("hardware", preset.id)}
            >
              <span className="flex flex-col gap-1">
                <span>{t(preset.desc_key)}</span>
                <span className="font-mono">
                  {t("config.hardware.memory")}: {t("common.gb", { value: fit?.memory_gb ?? 0 })}
                  {" - "}
                  {t("config.hardware.power")}: {t("common.kw", { value: preset.power_kw })}
                </span>
                <span className="font-mono">
                  {preset.cost_usd > 0
                    ? `${t("config.hardware.cost")}: ${t("common.usd", { value: preset.cost_usd })}`
                    : t("config.hardware.free")}
                </span>
                <span className={fit?.precision == null ? "text-crit" : "text-ok"}>
                  {fit?.precision == null
                    ? t("config.hardware.precision_none")
                    : `${t("config.hardware.precision")}: ${t(`precision.${fit.precision}`)}`}
                </span>
                {fit?.precision == null ? null : (
                  <span className="font-mono">
                    {t("config.hardware.needs", {
                      value: Math.round(fit.needed_gb),
                      precision: t(`precision.${fit.precision}`),
                    })}
                    {" - "}
                    {t("config.hardware.estimate", { value: fit.compute_hours_per_day })}
                  </span>
                )}
                <span className="text-warn">{t(preset.drawback_key)}</span>
              </span>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
