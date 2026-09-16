import type { DifficultySliders } from "@singularity/core";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../components/Button.js";
import { Card } from "../../../components/Card.js";
import { Slider } from "../../../components/Slider.js";
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

/**
 * Seed, difficulty, storyteller and the disclosed modifiers (SYS-04 "World settings").
 *
 * This is the one step with no list of things to choose between: the whole page is the settings, so
 * it uses the layout's listless mode and keeps the explanation window and the "?" that every other
 * step has. Each slider's effect is a line of the meaning block, colored against the preset the
 * player started from, so moving one says which way the game just went.
 */
export function WorldStep(): ReactNode {
  const { t } = useTranslation();
  const draft = useConfigurator((state) => state.draft);
  const set = useConfigurator((state) => state.set);
  const setDifficulty = useConfigurator((state) => state.setDifficulty);
  const setSlider = useConfigurator((state) => state.setSlider);
  const toggleModifier = useConfigurator((state) => state.toggleModifier);
  const newSeed = useConfigurator((state) => state.newSeed);

  const preset = difficultyById.get(draft.difficulty);

  return (
    <StepLayout
      listless
      step="world"
      entries={[]}
      title={t("config.step.world")}
      description={t("config.world.intro")}
      meaning={worldMeaning(t, draft.sliders, preset?.sliders ?? draft.sliders)}
    >
      <section className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-xs text-muted">
          {t("config.world.seed")}
          <input
            className="border border-line bg-panel2 px-2 py-1 font-mono text-sm text-fg"
            value={draft.seed}
            onChange={(event) => set("seed", event.target.value)}
          />
        </label>
        <Button onClick={newSeed}>{t("config.world.reroll_seed")}</Button>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-fg">{t("config.world.difficulty")}</h3>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {catalog.difficultyPresets.map((preset) => (
            <Card
              key={preset.id}
              title={t(preset.name_key)}
              selected={preset.id === draft.difficulty}
              onSelect={() => setDifficulty(preset.id)}
            >
              {t(preset.desc_key)}
            </Card>
          ))}
        </div>
      </section>

      <section className="grid gap-3 border border-line bg-panel p-3 sm:grid-cols-2">
        <h3 className="col-span-full text-sm font-semibold text-fg">{t("config.world.sliders")}</h3>
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

      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-fg">{t("config.world.storyteller")}</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {STORYTELLERS.map((storyteller) => (
            <Card
              key={storyteller}
              title={t(`config.world.storyteller.${storyteller}`)}
              selected={storyteller === draft.storyteller}
              onSelect={() => set("storyteller", storyteller)}
            >
              {t(`config.world.storyteller.${storyteller}_desc`)}
            </Card>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-fg">{t("config.world.modifiers")}</h3>
        <ul className="flex flex-col gap-1">
          {CHALLENGE_MODIFIERS.map((modifier) => (
            <li key={modifier.id}>
              <label className="flex items-start gap-2 text-sm text-fg">
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
            </li>
          ))}
        </ul>
        <label className="flex items-start gap-2 text-sm text-fg">
          <input
            type="checkbox"
            className="mt-1"
            checked={draft.ironman}
            onChange={(event) => set("ironman", event.target.checked)}
          />
          <span className="flex flex-col">
            <span>{t("config.world.ironman")}</span>
            <span className="text-xs text-muted">{t("config.world.ironman_desc")}</span>
          </span>
        </label>
      </section>
    </StepLayout>
  );
}
