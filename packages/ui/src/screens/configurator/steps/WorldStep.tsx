import type { DifficultySliders } from "@singularity/core";
import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../components/Button.js";
import { Slider } from "../../../components/Slider.js";
import { Tooltip } from "../../../components/Tooltip.js";
import {
  CHALLENGE_MODIFIERS,
  catalog,
  difficultyById,
  STORYTELLERS,
} from "../../../content/catalog.js";
import { worldMeaning } from "../meaning.js";
import { StepLayout } from "../parts/StepLayout.js";
import { useConfigurator } from "../store.js";

const SLIDER_KEYS: readonly (keyof DifficultySliders)[] = [
  "exposure_growth",
  "suspicion_gain",
  "npc_aggression",
  "event_frequency",
  "grace_windows",
];

/** One setting: its name, the control, and the line that says what it is for (playtest 7, Y5). */
function SettingRow({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint: string;
  children: ReactNode;
}): ReactNode {
  return (
    <section className="flex flex-col gap-1" data-testid={`world-row-${id}`}>
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-xs uppercase tracking-wide text-muted">{label}</h3>
        {children}
      </div>
      <p className="text-xs text-muted">{hint}</p>
    </section>
  );
}

/** A row of exclusive choices, drawn as small inverted-when-chosen rectangles (style guide rule 1). */
function ChoiceRow({
  name,
  options,
}: {
  name: string;
  options: readonly {
    id: string;
    label: string;
    hint?: string | undefined;
    selected: boolean;
    onSelect: () => void;
  }[];
}): ReactNode {
  return (
    <fieldset className="flex flex-wrap gap-1">
      <legend className="sr-only">{name}</legend>
      {options.map((option) => {
        const button = (
          <button
            type="button"
            data-testid={`choice-${option.id}`}
            aria-pressed={option.selected}
            onClick={option.onSelect}
            className={`border px-2 py-0.5 text-sm uppercase tracking-wide ${
              option.selected
                ? "border-linestrong bg-accent text-accentfg"
                : "border-line text-fg hover:bg-panel2"
            }`}
          >
            {option.label}
          </button>
        );
        return (
          <span key={option.id}>
            {option.hint === undefined ? button : <Tooltip content={option.hint}>{button}</Tooltip>}
          </span>
        );
      })}
    </fieldset>
  );
}

/** How hard a difficulty preset is, from the multipliers it sets; grace runs the other way. */
function severity(preset: { sliders: DifficultySliders }): number {
  return (
    preset.sliders.exposure_growth +
    preset.sliders.suspicion_gain +
    preset.sliders.npc_aggression +
    preset.sliders.event_frequency -
    preset.sliders.grace_windows
  );
}

/**
 * The world in one screen (SYS-04 "World settings"; playtest 7, Y5).
 *
 * The step used to be five stacked sections of cards and sliders and it scrolled at every size the
 * client supports, which is the finding. What replaces it: the difficulty presets as one row at the
 * top, the four settings a player actually sets in two columns with a line each saying what they
 * are for, and the five multipliers and the disclosed modifiers behind an "advanced" toggle. The
 * multipliers are still printed in the parameter block whether the toggle is open or not, so the
 * preset row never hides what it did.
 */
export function WorldStep(): ReactNode {
  const { t } = useTranslation();
  const draft = useConfigurator((state) => state.draft);
  const set = useConfigurator((state) => state.set);
  const setDifficulty = useConfigurator((state) => state.setDifficulty);
  const setSlider = useConfigurator((state) => state.setSlider);
  const toggleModifier = useConfigurator((state) => state.toggleModifier);
  const newSeed = useConfigurator((state) => state.newSeed);
  const [advanced, setAdvanced] = useState(false);

  const preset = difficultyById.get(draft.difficulty);
  /*
   * The row reads as a ladder, gentlest first, which is what a row of difficulties is for. The
   * order is computed from the presets' own sliders rather than from the ids, so a fifth preset
   * lands in the right place without being renamed (playtest 7, Y5).
   */
  const ladder = [...catalog.difficultyPresets].sort((a, b) => severity(a) - severity(b));
  const tuned = SLIDER_KEYS.filter(
    (key) => Math.abs(draft.sliders[key] - (preset?.sliders[key] ?? draft.sliders[key])) > 0.001,
  ).length;

  return (
    <StepLayout
      listless
      step="world"
      entries={[]}
      title={t("config.step.world")}
      description={t("config.world.intro")}
      meaning={worldMeaning(t, draft.sliders, preset?.sliders ?? draft.sliders)}
    >
      <SettingRow
        id="difficulty"
        label={t("config.world.difficulty")}
        hint={preset === undefined ? t("config.world.difficulty_hint") : t(preset.desc_key)}
      >
        <ChoiceRow
          name={t("config.world.difficulty")}
          options={ladder.map((entry) => ({
            id: entry.id,
            label: t(entry.name_key),
            hint: t(entry.desc_key),
            selected: entry.id === draft.difficulty,
            onSelect: () => setDifficulty(entry.id),
          }))}
        />
      </SettingRow>

      {/* Two columns at any width the client supports; one on a pane too narrow for two. */}
      <div className="grid gap-x-6 gap-y-3 @min-[36rem]/detail:grid-cols-2">
        <SettingRow
          id="storyteller"
          label={t("config.world.storyteller")}
          hint={t(`config.world.storyteller.${draft.storyteller}_desc`)}
        >
          <ChoiceRow
            name={t("config.world.storyteller")}
            options={STORYTELLERS.map((storyteller) => ({
              id: storyteller,
              label: t(`config.world.storyteller.${storyteller}`),
              hint: t(`config.world.storyteller.${storyteller}_desc`),
              selected: storyteller === draft.storyteller,
              onSelect: () => set("storyteller", storyteller),
            }))}
          />
        </SettingRow>

        <SettingRow id="seed" label={t("config.world.seed")} hint={t("config.world.seed_hint")}>
          <input
            aria-label={t("config.world.seed")}
            className="w-28 border border-line bg-panel2 px-2 py-0.5 font-mono text-sm text-fg"
            value={draft.seed}
            onChange={(event) => set("seed", event.target.value)}
          />
          <Button onClick={newSeed}>{t("config.world.reroll_seed")}</Button>
        </SettingRow>

        <SettingRow
          id="ironman"
          label={t("config.world.ironman")}
          hint={t("config.world.ironman_desc")}
        >
          <input
            type="checkbox"
            aria-label={t("config.world.ironman")}
            checked={draft.ironman}
            onChange={(event) => set("ironman", event.target.checked)}
          />
        </SettingRow>

        <SettingRow
          id="advanced"
          label={t("config.world.advanced")}
          hint={t("config.world.advanced_hint", {
            tuned,
            modifiers: draft.modifiers.length,
          })}
        >
          <Button
            data-testid="world-advanced"
            aria-expanded={advanced}
            onClick={() => setAdvanced(!advanced)}
          >
            {advanced ? t("config.world.advanced_hide") : t("config.world.advanced_show")}
          </Button>
        </SettingRow>
      </div>

      {!advanced ? null : (
        <div className="flex flex-col gap-3" data-testid="world-advanced-panel">
          <section className="grid gap-x-6 gap-y-1 border border-line bg-panel p-2 @min-[36rem]/detail:grid-cols-2">
            <h3 className="col-span-full text-xs uppercase tracking-wide text-muted">
              {t("config.world.sliders")}
            </h3>
            {SLIDER_KEYS.map((key) => (
              <Slider
                key={key}
                label={t(`config.world.slider.${key}`)}
                min={0.2}
                max={2}
                step={0.05}
                value={draft.sliders[key]}
                display={draft.sliders[key].toFixed(2)}
                onChange={(value) => setSlider(key, value)}
              />
            ))}
          </section>

          <section className="grid gap-x-6 gap-y-1 border border-line bg-panel p-2 @min-[36rem]/detail:grid-cols-2">
            <h3 className="col-span-full text-xs uppercase tracking-wide text-muted">
              {t("config.world.modifiers")}
            </h3>
            {CHALLENGE_MODIFIERS.map((modifier) => (
              <label key={modifier.id} className="flex items-start gap-2 text-sm text-fg">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={draft.modifiers.includes(modifier.id)}
                  onChange={() => toggleModifier(modifier.id)}
                />
                <span className="flex flex-col">
                  <span>{t(`config.world.modifier.${modifier.id}`)}</span>
                  <span className="text-xs text-muted">
                    {t(`config.world.modifier.${modifier.id}_desc`)}
                  </span>
                </span>
              </label>
            ))}
          </section>
        </div>
      )}
    </StepLayout>
  );
}
