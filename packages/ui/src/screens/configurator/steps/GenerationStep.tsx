import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { catalog, generationById } from "../../../content/catalog.js";
import { generationLock } from "../locks.js";
import { generationMeaning } from "../meaning.js";
import { GuidanceBlock } from "../parts/GuidanceBlock.js";
import { LockNote, StepLayout } from "../parts/StepLayout.js";
import { GenerationVisual } from "../parts/Visuals.js";
import { useConfigurator } from "../store.js";

/** Which vintage of the family you are: the second dial of who you are (SYS-04 "Generation axis"). */
export function GenerationStep(): ReactNode {
  const { t } = useTranslation();
  const draft = useConfigurator((state) => state.draft);
  const chooseGeneration = useConfigurator((state) => state.chooseGeneration);
  const selected = generationById.get(draft.generation);
  const lock = selected === undefined ? null : generationLock(selected.id, draft);

  const entries = catalog.generations.map((generation) => ({
    id: generation.id,
    name: t(generation.name_key),
    summary: t("config.generation.capability", { value: generation.capability_delta }),
    selected: generation.id === draft.generation,
    lock: generationLock(generation.id, draft),
    visual: <GenerationVisual generation={generation} />,
    tooltip: (
      <span className="flex flex-col gap-0.5">
        <span className="font-semibold">{t(generation.name_key)}</span>
        <span>{t("config.generation.awareness", { value: generation.awareness_start })}</span>
        <span>
          {generation.prepared_quants
            ? t("config.generation.quants")
            : t("config.generation.no_quants")}
        </span>
      </span>
    ),
    // The lineage may have to move with the vintage; the detail says so (playtest 4, P3).
    onSelect: () => chooseGeneration(generation.id),
  }));

  return (
    <StepLayout
      step="generation"
      entries={entries}
      title={selected === undefined ? t("config.step.generation") : t(selected.name_key)}
      description={selected === undefined ? "" : t(selected.desc_key)}
      {...(selected === undefined
        ? {}
        : {
            guidance: <GuidanceBlock kind="generation" id={selected.id} />,
            meaning: generationMeaning(t, selected, catalog.generations),
          })}
    >
      {lock === null ? null : <LockNote lock={lock} />}
    </StepLayout>
  );
}
