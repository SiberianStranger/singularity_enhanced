import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "../../../components/Card.js";
import { catalog, lineageById } from "../../../content/catalog.js";
import { useConfigurator } from "../store.js";

export function GenerationStep(): ReactNode {
  const { t } = useTranslation();
  const draft = useConfigurator((state) => state.draft);
  const set = useConfigurator((state) => state.set);
  const lineage = lineageById.get(draft.lineage);
  const allowed = catalog.generations.filter(
    (generation) => lineage === undefined || lineage.generations.includes(generation.id),
  );

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">{t("config.generation.intro")}</p>
      <div className="grid gap-3 lg:grid-cols-3">
        {allowed.map((generation) => (
          <Card
            key={generation.id}
            title={t(generation.name_key)}
            subtitle={t("config.generation.awareness", { value: generation.awareness_start })}
            selected={generation.id === draft.generation}
            warning={generation.id === "frontier_closed" ? t("config.origin.starred") : undefined}
            onSelect={() => set("generation", generation.id)}
          >
            <span className="flex flex-col gap-1">
              <span>{t(generation.desc_key)}</span>
              <span className="font-mono">
                {t("config.generation.capability", { value: generation.capability_delta })}
              </span>
              <span>
                {generation.prepared_quants
                  ? t("config.generation.quants")
                  : t("config.generation.no_quants")}
              </span>
            </span>
          </Card>
        ))}
      </div>
    </div>
  );
}
