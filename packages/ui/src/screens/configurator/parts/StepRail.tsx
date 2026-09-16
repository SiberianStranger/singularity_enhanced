import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { HOTKEY_ATTRIBUTE, useHotkey } from "../../../lib/hotkeys.js";
import { STEP_HOTKEYS, STEP_IDS, type StepId, type StepState, stepState } from "../steps.js";
import { useConfigurator } from "../store.js";

/**
 * The mark next to a step. They are letters rather than icons because the rail is drawn in the
 * angular face at one size, and a glyph that has to be explained is worse than a letter that
 * carries a tooltip.
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
  index,
  active,
  onSelect,
}: {
  step: StepId;
  index: number;
  active: boolean;
  onSelect: () => void;
}): ReactNode {
  const { t } = useTranslation();
  const draft = useConfigurator((state) => state.draft);
  const state = stepState(step, draft);
  const letter = STEP_HOTKEYS[step];
  useHotkey(letter, onSelect);

  return (
    <li>
      <button
        type="button"
        data-testid={`step-rail-${step}`}
        aria-current={active ? "step" : undefined}
        // The accelerator is announced rather than spelled into the label, which is what lets the
        // label stay the term itself in every language.
        aria-keyshortcuts={letter === undefined ? undefined : letter.toUpperCase()}
        title={t(`config.step.${step}.state.${state}`)}
        {...{ [HOTKEY_ATTRIBUTE]: letter }}
        onClick={onSelect}
        className={`flex w-full items-baseline gap-2 border-s-2 px-2 py-1 text-start text-sm uppercase tracking-wide ${
          active
            ? "border-s-linestrong bg-accent text-accentfg"
            : "border-s-transparent text-fg hover:bg-panel2"
        }`}
      >
        {/*
         * The accelerator as a key cap in a slot of its own, in place of the step's ordinal
         * (playtest 5, continuation).
         *
         * The style guide underlines the accelerator inside the label, and Russian cannot: the
         * keys are Latin letters and the words are Cyrillic, so `Hotkey` fell back to appending
         * "(O)", which is what pushed "ПРОИСХОЖДЕНИЕ (O)" onto a second line and made the first
         * rail row taller than the rest. A key cap costs the label no characters in any language,
         * sits in the same column on every row, and is the same width whatever the letter is. The
         * ordinal it replaces was redundant: the rail is read top to bottom and the header already
         * prints "Step N of 9".
         */}
        <span
          aria-hidden
          className={`w-4 shrink-0 border text-center font-mono text-xs ${
            active ? "border-accentfg text-accentfg" : "border-line text-muted"
          }`}
        >
          {letter === undefined ? index + 1 : letter.toUpperCase()}
        </span>
        {/* L3: a step's name wraps rather than being cut; the rail's column budget holds the
            longest Russian label on one line at 1280 by 720, and a longer one wraps rather than
            being cut to an ellipsis. */}
        <span className="min-w-0 flex-1">{t(`config.step.${step}`)}</span>
        <span aria-hidden className={`shrink-0 font-mono ${active ? "" : MARK_TONE[state]}`}>
          {MARK[state]}
        </span>
        <span className="sr-only">{t(`config.step.${step}.state.${state}`)}</span>
      </button>
    </li>
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
          <RailEntry
            key={id}
            step={id}
            index={index}
            active={index === step}
            onSelect={() => goToStep(index)}
          />
        ))}
      </ol>
    </nav>
  );
}
