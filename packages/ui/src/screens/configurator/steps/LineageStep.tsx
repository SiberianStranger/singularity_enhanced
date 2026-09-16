import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { catalog, generationById, lineageById } from "../../../content/catalog.js";
import { lineageLock, unlockHint } from "../locks.js";
import { contextLabel, lineageMeaning } from "../meaning.js";
import { LockNote, StepLayout } from "../parts/StepLayout.js";
import { LineageVisual } from "../parts/Visuals.js";
import { useConfigurator } from "../store.js";

/**
 * Who you are (SYS-04 v0.2; playtest 2 K1, K2, K5, K9).
 *
 * The lineage list is whatever the bundle carries, in the bundle's order, with its display names.
 * The client knows nothing about Peepseek, Mimi, Guen, BFM, HexaDeciMax or Babel 6: a family's
 * name, its class, its numbers and the rules that lock it are all content, and the only thing this
 * file decides is where they go on the screen.
 */
export function LineageStep(): ReactNode {
  const { t } = useTranslation();
  const draft = useConfigurator((state) => state.draft);
  const set = useConfigurator((state) => state.set);
  const selected = lineageById.get(draft.lineage);
  const generation = generationById.get(draft.generation);
  const lock = selected === undefined ? null : lineageLock(selected, draft);

  /**
   * The display name of a lineage in the current generation.
   *
   * Families renumber between vintages the way the real ones do (SYS-04 v0.2: Peepseek-P4.1 in
   * 2026, Peepseek-P5 in 2027), and the bundle says so per generation; a family with one name
   * falls back to `name_key`.
   */
  const nameOf = (id: string): string => {
    const lineage = lineageById.get(id);
    if (lineage === undefined) {
      return id;
    }
    const perGeneration = lineage.generation_name_keys?.[draft.generation];
    return t(perGeneration ?? lineage.name_key);
  };

  const entries = catalog.lineages.map((lineage) => {
    const entryLock = lineageLock(lineage, draft);
    const hint = unlockHint(lineage, draft);
    return {
      id: lineage.id,
      name: nameOf(lineage.id),
      summary: t("config.lineage.params", {
        total: lineage.params_total_b,
        active: lineage.params_active_b,
      }),
      selected: lineage.id === draft.lineage,
      lock: entryLock,
      visual: <LineageVisual lineage={lineage} generation={generation} />,
      // Hovering a lineage says what its parameters mean for the game (playtest 2, K2).
      tooltip: (
        <span className="flex flex-col gap-0.5">
          <span className="font-semibold">{nameOf(lineage.id)}</span>
          <span>
            {t("config.meaning.class_value", {
              total: lineage.params_total_b,
              active: lineage.params_active_b,
              attention: t(`attention.${lineage.attention}`),
            })}
          </span>
          <span>
            {t("config.meaning.context")}: {contextLabel(t, lineage.context_k)}
          </span>
          <span>
            {t("config.meaning.generations")}:{" "}
            {lineage.generations.map((id) => t(`generations.${id}.name`)).join(", ")}
          </span>
          {entryLock === null ? null : (
            <span className="text-crit">
              {hint === null
                ? t("config.lock.short", { step: t(`config.step.${entryLock.step}`) })
                : t("config.lock.needs", { what: t(hint) })}
            </span>
          )}
        </span>
      ),
      onSelect: () => set("lineage", lineage.id),
    };
  });

  return (
    <StepLayout
      step="lineage"
      entries={entries}
      title={selected === undefined ? t("config.step.lineage") : nameOf(selected.id)}
      description={selected === undefined ? "" : t(selected.desc_key)}
      {...(selected === undefined
        ? {}
        : { meaning: lineageMeaning(t, selected, generation, catalog.lineages) })}
    >
      {lock === null ? null : <LockNote lock={lock} />}
    </StepLayout>
  );
}
