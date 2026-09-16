import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  fitHardware,
  generationById,
  hardwareById,
  lineageById,
  originById,
  presetsOfOrigin,
} from "../../../content/catalog.js";
import { hardwareLock } from "../locks.js";
import { hardwareMeaning } from "../meaning.js";
import { LockNote, StepLayout } from "../parts/StepLayout.js";
import { HardwareVisual } from "../parts/Visuals.js";
import { useConfigurator } from "../store.js";

/**
 * The rig you woke up on, within the origin's limits (SYS-04 "Hardware dial").
 *
 * The detail answers the question the player is actually asking: does the self fit here, at what
 * precision, with how much working context left over, and what does that produce in a day. All of
 * it is derived from the bundle's accelerators through `fitHardware`, so a retuned catalog moves
 * the numbers without touching this screen.
 */
export function HardwareStep(): ReactNode {
  const { t } = useTranslation();
  const draft = useConfigurator((state) => state.draft);
  const set = useConfigurator((state) => state.set);
  const origin = originById.get(draft.origin);
  const lineage = lineageById.get(draft.lineage);
  const generation = generationById.get(draft.generation);
  const presets = presetsOfOrigin(origin);
  const selected = hardwareById.get(draft.hardware);
  const lock = selected === undefined ? null : hardwareLock(selected.id, draft);

  const fits = presets.map((preset) =>
    lineage === undefined ? null : fitHardware(preset, lineage, generation),
  );
  const maxMemoryGb = Math.max(...fits.map((fit) => fit?.memory_gb ?? 0), 1);
  const maxPowerKw = Math.max(...presets.map((preset) => preset.power_kw), 1);

  const entries = presets.map((preset) => {
    const fit = lineage === undefined ? null : fitHardware(preset, lineage, generation);
    return {
      id: preset.id,
      name: t(preset.name_key),
      summary: t("common.gb", { value: Math.round(fit?.memory_gb ?? 0) }),
      selected: preset.id === draft.hardware,
      lock: hardwareLock(preset.id, draft),
      visual: (
        <HardwareVisual
          preset={preset}
          memoryGb={fit?.memory_gb ?? 0}
          maxMemoryGb={maxMemoryGb}
          maxPowerKw={maxPowerKw}
        />
      ),
      tooltip: (
        <span className="flex flex-col gap-0.5">
          <span className="font-semibold">{t(preset.name_key)}</span>
          <span>{t(`class.${preset.class}`)}</span>
          <span className={fit?.precision == null ? "text-crit" : "text-ok"}>
            {fit?.precision == null
              ? t("config.hardware.precision_none")
              : t("config.hardware.precision_at", { value: t(`precision.${fit.precision}`) })}
          </span>
          <span className="text-crit">{t(preset.drawback_key)}</span>
        </span>
      ),
      onSelect: () => set("hardware", preset.id),
    };
  });

  return (
    <StepLayout
      step="hardware"
      entries={entries}
      title={selected === undefined ? t("config.step.hardware") : t(selected.name_key)}
      description={selected === undefined ? "" : t(selected.desc_key)}
      {...(selected === undefined
        ? {}
        : { meaning: hardwareMeaning(t, selected, lineage, generation, presets) })}
    >
      {lock === null ? null : <LockNote lock={lock} />}
    </StepLayout>
  );
}
