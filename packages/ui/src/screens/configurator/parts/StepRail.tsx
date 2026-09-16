import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Hotkey } from "../../../components/Hotkey.js";
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
        title={t(`config.step.${step}.state.${state}`)}
        {...{ [HOTKEY_ATTRIBUTE]: letter }}
        onClick={onSelect}
        className={`flex w-full items-baseline gap-2 border-s-2 px-2 py-1 text-start text-sm uppercase tracking-wide ${
          active
            ? "border-s-linestrong bg-accent text-accentfg"
            : "border-s-transparent text-fg hover:bg-panel2"
        }`}
      >
        <span className="w-4 shrink-0 font-mono text-xs text-muted">{index + 1}</span>
        {/* L3: a step's name wraps rather than being cut; the rail is 11rem wide and a
            translation longer than the English belongs on two lines, not behind an ellipsis. */}
        <span className="min-w-0 flex-1">
          <Hotkey label={t(`config.step.${step}`)} letter={letter} />
        </span>
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
