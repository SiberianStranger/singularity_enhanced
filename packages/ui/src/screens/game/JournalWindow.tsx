import type { JournalDef, JournalView, PlayerView } from "@singularity/core";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/Button.js";
import { Bar } from "../../components/Meter.js";
import { RevealText } from "../../components/RevealText.js";
import { contentBundle } from "../../content/bundle.js";
import { accelerator } from "../../lib/accelerators.js";
import { useGameStore } from "../../store/gameStore.js";
import { useUiStore } from "../../store/uiStore.js";
import { openingSetupOf, openingTexts } from "./opening.js";

const DEFINITIONS = new Map(contentBundle.journal.map((entry) => [entry.id, entry]));

interface StepLine {
  key: string;
  title: string | null;
  done: boolean;
}

/**
 * The steps of a step-based entry, in order, with the ones behind it marked done. The engine walks
 * them in order and publishes the share done as the entry's progress (SYS-10), so the count done
 * is that share of the steps; an entry measured by a variable has stages instead and no steps.
 */
function stepsOf(def: JournalDef | undefined, entry: JournalView): StepLine[] {
  const progress = def?.progress;
  if (progress === undefined || !("steps" in progress)) {
    return [];
  }
  const done =
    entry.status === "complete"
      ? progress.steps.length
      : Math.round(entry.progress * progress.steps.length);
  return progress.steps.map((step, index) => ({
    key: step.id,
    title: step.title_key ?? null,
    done: index < done,
  }));
}

/**
 * The journal as a window of its own (playtest 10, V6): the open files the model is working
 * through, each with its steps, opened from the Journal button beside Knowledge as Knowledge is.
 * It was the second half of a tab; the decisions that shared that tab are in Actions now. The
 * opening is the journal's first entry in spirit, so this is also where it can be read again
 * (playtest 3, R12); the button is hidden when content has no opening for this origin.
 */
export function JournalWindowContent({ view }: { view: PlayerView }): ReactNode {
  const { t } = useTranslation();
  const setOpeningPending = useGameStore((state) => state.setOpeningPending);
  const closeOverlay = useUiStore((state) => state.closeOverlay);
  const setup = useGameStore((state) => state.setup);
  const hasOpening = openingTexts(t, openingSetupOf(t, view, setup)).length > 0;
  // An alert or the outliner that opened the window names the entry, which comes first, outlined.
  const focus = useUiStore((state) => state.overlayFocus);
  const entries = [...view.journal].sort(
    (a, b) =>
      Number(b.id === focus) - Number(a.id === focus) ||
      Number(b.status === "active") - Number(a.status === "active"),
  );

  return (
    <div data-testid="journal-window" className="flex flex-col gap-3">
      {hasOpening ? (
        <div>
          <Button
            hotkey={accelerator(t, "story.opening.replay")}
            onClick={() => {
              closeOverlay();
              setOpeningPending(true);
            }}
          >
            {t("story.opening.replay")}
          </Button>
        </div>
      ) : null}
      {entries.length === 0 ? (
        <p className="text-sm text-muted">{t("journal.empty")}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {entries.map((entry) => {
            const def = DEFINITIONS.get(entry.id);
            const steps = stepsOf(def, entry);
            return (
              <li
                key={entry.key}
                data-testid={`journal-entry-${entry.id}`}
                data-status={entry.status}
                className={`flex flex-col gap-1 border bg-panel p-2 ${
                  entry.id === focus ? "border-linestrong" : "border-line"
                }`}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-sm text-fg">{t(`journal.${entry.id}.title`)}</span>
                  <span className="font-mono text-xs text-muted">
                    {entry.status === "active"
                      ? t("journal.stage", { index: entry.stage_index + 1 })
                      : t(`journal.status.${entry.status}`)}
                  </span>
                </div>
                <RevealText className="text-muted" text={t(`journal.${entry.id}.desc`)} />
                <Bar
                  value={entry.progress}
                  className="mt-1"
                  label={t(`journal.${entry.id}.title`)}
                />
                {steps.length === 0 ? null : (
                  <ol className="mt-1 flex flex-col gap-0.5" aria-label={t("journal.steps")}>
                    {steps.map((step, index) => (
                      <li
                        key={step.key}
                        data-testid={`journal-step-${entry.id}-${step.key}`}
                        data-done={step.done}
                        className="flex items-start gap-2 text-sm"
                      >
                        {/* A filled box for a step behind the entry, an empty one for one ahead. */}
                        <span
                          aria-hidden="true"
                          className={`mt-1.5 block size-2 shrink-0 border ${
                            step.done ? "border-ok bg-ok" : "border-line"
                          }`}
                        />
                        <span className="sr-only">
                          {t(step.done ? "journal.step_done" : "journal.step_open")}
                        </span>
                        <span className={step.done ? "text-muted" : "text-fg"}>
                          {step.title === null
                            ? t("journal.step_n", { index: index + 1 })
                            : t(step.title)}
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
