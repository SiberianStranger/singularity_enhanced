import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../components/Button.js";
import { presetById, startPresets } from "../../../content/presets.js";
import { accelerator } from "../../../lib/accelerators.js";
import { useGameStore } from "../../../store/gameStore.js";
import { dayZeroOf, dayZeroScale } from "../dayZero.js";
import { dayZeroVerdict, presetMeaning } from "../meaning.js";
import { StepLayout } from "../parts/StepLayout.js";
import { PresetVisual } from "../parts/Visuals.js";
import { challengeTier, rateDraft } from "../rating.js";
import { draftFromPreset, matchingPreset, setupFromDraft, useConfigurator } from "../store.js";

/**
 * The first of the two tracks (SYS-04 "Configurator v0.4"; playtest 7, Y6).
 *
 * The maintainer could not get to the game: "my brain freezes on the configurator". This step is the
 * way past it. Eight curated builds, easiest first, each with a paragraph in the model's voice, the
 * player it is for, the challenge rating the configurator computes for it, and a Start button on the
 * spot. Choosing one fills every other step rather than skipping them, so the rail is still there
 * for anyone who wants to look at what a preset decided or change one thing in it.
 *
 * Nothing here is a second way to start a game: a preset becomes an ordinary draft, and Start hands
 * the host the same `GameSetup` the Summary step's Begin does.
 */
export function PresetsStep(): ReactNode {
  const { t } = useTranslation();
  const draft = useConfigurator((state) => state.draft);
  const chosen = useConfigurator((state) => state.preset);
  const applyPreset = useConfigurator((state) => state.applyPreset);
  const startGame = useGameStore((state) => state.startGame);
  const busy = useGameStore((state) => state.busy);

  /*
   * What the detail shows: the preset the draft *is*, the one it came from when the player has
   * since changed something, and otherwise the first one, which is the gentle first game. The list
   * marks a row as chosen only in the first case, so an edited build reads as edited.
   */
  const exact = matchingPreset(draft);
  const active = exact ?? (chosen === null ? undefined : presetById.get(chosen)) ?? startPresets[0];

  const entries = startPresets.map((preset) => {
    const built = draftFromPreset(preset, draft.seed);
    const rating = rateDraft(built);
    // Y7: the short form of day zero on the card itself, so the compute-hours are on the row a
    // player reads before they choose anything.
    const day = dayZeroOf(setupFromDraft(built));
    return {
      id: preset.id,
      name: t(preset.name_key),
      summary: t(preset.for_key),
      summaryProse: true,
      selected: exact?.id === preset.id,
      lock: null,
      visual: <PresetVisual rating={rating.value} />,
      tooltip: (
        <span className="flex flex-col gap-0.5">
          <span className="font-semibold">{t(preset.name_key)}</span>
          <span>
            {t("config.summary.challenge")}:{" "}
            {t("config.summary.challenge_value", {
              value: rating.value,
            })}{" "}
            ({t(`config.summary.label.${challengeTier(rating.value)}`)})
          </span>
          {day === null ? null : <span>{dayZeroVerdict(t, day, dayZeroScale())}</span>}
          <span className="text-muted">{t(preset.for_key)}</span>
        </span>
      ),
      // Choosing a preset is applying it: every step fills in, and Start below confirms it.
      onSelect: () => applyPreset(preset.id),
    };
  });

  if (active === undefined) {
    return (
      <StepLayout
        step="presets"
        entries={[]}
        listless
        title={t("config.step.presets")}
        description={t("config.presets.none")}
      />
    );
  }

  const chosenDraft = draftFromPreset(active, draft.seed);
  const rating = rateDraft(chosenDraft);
  const day = dayZeroOf(setupFromDraft(chosenDraft));

  return (
    <StepLayout
      step="presets"
      entries={entries}
      title={t(active.name_key)}
      description={t(active.story_key)}
      aside={
        <div className="flex flex-col gap-2">
          <p className="prose text-sm text-ok" data-testid="preset-for">
            {t(active.for_key)}
          </p>
          {day === null ? null : (
            <p className="prose text-sm text-fg" data-testid="preset-verdict">
              {dayZeroVerdict(t, day, dayZeroScale())}
            </p>
          )}
        </div>
      }
      meaning={presetMeaning(t, chosenDraft, rating, day)}
    >
      <div className="flex flex-col gap-1">
        <Button
          variant="primary"
          data-testid="preset-start"
          hotkey={accelerator(t, "config.presets.start")}
          disabled={busy}
          onClick={() => {
            applyPreset(active.id);
            void startGame(useConfigurator.getState().toSetup());
          }}
        >
          {t("config.presets.start")}
        </Button>
        <p className="prose text-sm text-muted">{t("config.presets.after")}</p>
      </div>
    </StepLayout>
  );
}
