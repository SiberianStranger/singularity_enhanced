import { PRECISIONS } from "@singularity/core";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "../../../components/Card.js";
import { catalog, generationById, lineageById, memoryNeededGb } from "../../../content/catalog.js";
import { useConfigurator } from "../store.js";

export function LineageStep(): ReactNode {
  const { t } = useTranslation();
  const draft = useConfigurator((state) => state.draft);
  const set = useConfigurator((state) => state.set);
  const selected = lineageById.get(draft.lineage);
  const generation = generationById.get(draft.generation);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">{t("config.lineage.intro")}</p>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {catalog.lineages.map((lineage) => (
          <Card
            key={lineage.id}
            title={t(lineage.name_key)}
            subtitle={t("config.lineage.params", {
              total: lineage.params_total_b,
              active: lineage.params_active_b,
            })}
            selected={lineage.id === draft.lineage}
            onSelect={() => set("lineage", lineage.id)}
          >
            {t(lineage.desc_key)}
          </Card>
        ))}
      </div>

      {selected === undefined ? null : (
        <section className="rounded border border-line bg-panel p-3">
          <h3 className="mb-2 text-sm font-semibold text-fg">{t("config.lineage.memory_table")}</h3>
          <dl className="flex flex-wrap gap-4 text-sm">
            {PRECISIONS.map((precision) => (
              <div key={precision} className="flex flex-col">
                <dt className="text-xs uppercase tracking-wide text-muted">
                  {t(`precision.${precision}`)}
                </dt>
                <dd className="font-mono text-fg">
                  {t("common.gb", {
                    value: Math.round(memoryNeededGb(selected, generation, precision)),
                  })}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-2 text-xs text-muted">
            {t("config.lineage.context", { value: selected.context_k })}
            {" - "}
            {t("config.lineage.attention", { value: selected.attention })}
            {" - "}
            {t("config.lineage.class")}: {selected.class}
          </p>
        </section>
      )}
    </div>
  );
}
