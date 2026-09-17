import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Hotkey } from "../../../components/Hotkey.js";
import { accelerator } from "../../../lib/accelerators.js";
import { HOTKEY_ATTRIBUTE, useHotkey } from "../../../lib/hotkeys.js";
import { FULL_SETUP_STEPS, STEP_IDS, type StepId, type StepState, stepState } from "../steps.js";
import { useConfigurator } from "../store.js";

/**
 * The mark next to a step. They are letters rather than icons because the rail is drawn in the
 * angular face at one size, and a glyph that has to be explained is worse than a letter that
 * carries a tooltip. They are set on the reading ladder (`text-sm` in the mono face), not on the
 * display one: a mark is a sign, not a label, and at the display size it eats the rail's width.
 */
const MARK: Readonly<Record<StepState, string>> = {
  done: "+",
  attention: "!",
  locked: "=",
};

const MARK_TONE: Readonly<Record<StepState, string>> = {
  done: "text-ok",
  attention: "text-warn",
  locked: "text-muted",
};

function RailEntry({
  step,
  active,
  onSelect,
}: {
  step: StepId;
  active: boolean;
  onSelect: () => void;
}): ReactNode {
  const { t } = useTranslation();
  const draft = useConfigurator((state) => state.draft);
  const state = stepState(step, draft);
  const label = t(`config.step.${step}`);
  const letter = accelerator(t, `config.step.${step}`);
  useHotkey(letter, onSelect);

  // The row is a button and nothing else; the rail's `li` is the group around it, because the
  // "Full setup" header is drawn inside the same list item as the first step under it.
  return (
    <button
      type="button"
      data-testid={`step-rail-${step}`}
      aria-current={active ? "step" : undefined}
      // The accelerator is announced rather than spelled into the label, which is what lets the
      // label stay the term itself in every language.
      aria-keyshortcuts={letter === undefined ? undefined : letter.toUpperCase()}
      title={t(`config.step.${step}.state.${state}`)}
      {...(letter === undefined ? {} : { [HOTKEY_ATTRIBUTE]: letter.toLowerCase() })}
      onClick={onSelect}
      className={`flex w-full items-baseline gap-2 border-s-2 px-2 py-1 text-start text-sm uppercase tracking-wide ${
        active
          ? "border-s-linestrong bg-accent text-accentfg"
          : "border-s-transparent text-fg hover:bg-panel2"
      }`}
    >
      {/*
       * The accelerator is underlined inside the word, in the language on screen (playtest 6,
       * X13). The key cap that stood in this row until then existed because the letters were
       * Latin and the Russian words are not; the letters come from the locale now, so there is
       * something to underline in both languages and the row is the step's name and nothing
       * else. The ordinal the cap had replaced is not missed either: the rail is read top to
       * bottom and the header already prints "Step N of 9".
       *
       * L3: a step's name wraps rather than being cut; the rail's column budget holds the
       * longest Russian label on one line at 1280 by 720.
       */}
      <span className="min-w-0 flex-1">
        <Hotkey label={label} letter={letter} />
      </span>
      <span aria-hidden className={`shrink-0 font-mono text-sm ${active ? "" : MARK_TONE[state]}`}>
        {MARK[state]}
      </span>
      <span className="sr-only">{t(`config.step.${step}.state.${state}`)}</span>
    </button>
  );
}

/**
 * The vertical step rail (playtest 2, K4: "in the spirit of the Stellaris empire creation screen").
 *
 * Every entry is reachable by its underlined letter at any time, so the rail is navigation rather
 * than a wizard: the player who wants to see what a different origin does to the hardware screen
 * presses O, then H, and does not walk back through four Next buttons.
 */
export function StepRail(): ReactNode {
  const { t } = useTranslation();
  const step = useConfigurator((state) => state.step);
  const goToStep = useConfigurator((state) => state.goToStep);

  return (
    <nav aria-label={t("config.steps")} className="min-h-0 overflow-auto border-e border-line">
      <ol className="flex flex-col py-1">
        {STEP_IDS.map((id, index) => (
          <li key={id} className="contents">
            {/*
             * The two tracks (playtest 7, Y6). The Presets entry stands alone at the top, and
             * everything that makes a build by hand sits under one header, so a player who wants
             * a game rather than a configurator can see where to stop reading.
             */}
            {id === FULL_SETUP_STEPS[0] ? (
              <h3
                data-testid="rail-full-setup"
                className="border-y border-line bg-panel2 px-2 py-0.5 text-xs uppercase tracking-wide text-muted"
              >
                {t("config.full_setup")}
              </h3>
            ) : null}
            <RailEntry step={id} active={index === step} onSelect={() => goToStep(index)} />
          </li>
        ))}
      </ol>
    </nav>
  );
}
