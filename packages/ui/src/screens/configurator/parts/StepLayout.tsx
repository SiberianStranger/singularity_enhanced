import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../components/Button.js";
import { Modal } from "../../../components/Modal.js";
import { Tooltip } from "../../../components/Tooltip.js";
import { useUiStore } from "../../../store/uiStore.js";
import type { Lock } from "../locks.js";
import type { Meaning } from "../meaning.js";
import { STEP_IDS, type StepId } from "../steps.js";
import { useConfigurator } from "../store.js";
import { MeaningBlock } from "./MeaningBlock.js";

/** One row of the list on the left: a name, one line under it, and a tooltip with the rest. */
export interface ListEntry {
  id: string;
  name: string;
  /** The compact visual summary drawn before the text (playtest 3, R15). */
  visual?: ReactNode;
  /** One line; the list is not the place for a paragraph. */
  summary: string;
  /** Hover tooltip; the whole point of playtest 2 K6 ("tooltips on everything"). */
  tooltip?: ReactNode;
  /** Set when an earlier step makes this entry unavailable; the detail explains it. */
  lock?: Lock | null;
  selected: boolean;
  onSelect(): void;
}

/**
 * The explanation window each step opens with (playtest 2, K6).
 *
 * It is shown once per browser per step and can be brought back from the "?" in the step header,
 * which is where a player looks for it. What has been seen lives in the UI store, so it survives a
 * reload and is not part of a save: a new game does not re-explain the configurator to someone who
 * has played five.
 */
function IntroWindow({ step, onClose }: { step: StepId; onClose: () => void }): ReactNode {
  const { t } = useTranslation();
  const body = t(`config.intro.${step}`, { defaultValue: "" });

  if (body === "") {
    return null;
  }

  return (
    <Modal
      title={t(`config.step.${step}`)}
      onClose={onClose}
      footer={
        <Button variant="primary" hotkey="g" onClick={onClose}>
          {t("config.intro.got_it")}
        </Button>
      }
    >
      <p className="prose">{body}</p>
    </Modal>
  );
}

/** The in-place explanation of a lock, with the jump to the step that would lift it (K9). */
export function LockNote({ lock }: { lock: Lock }): ReactNode {
  const { t } = useTranslation();
  const goToStep = useConfigurator((state) => state.goToStep);
  const index = STEP_IDS.indexOf(lock.step);

  return (
    <div
      data-testid="lock-note"
      data-lock-step={lock.step}
      className="flex flex-col gap-1 border border-crit bg-panel2 p-2"
    >
      <span className="text-xs uppercase tracking-wide text-crit">
        {t("config.lock.title", { step: t(`config.step.${lock.step}`) })}
      </span>
      <p className="prose text-sm text-fg">
        {t(lock.key, {
          ...lock.vars,
          // Content writes these as locale keys; the reason reads as prose either way.
          lineage: typeof lock.vars.lineage === "string" ? t(lock.vars.lineage) : lock.vars.lineage,
          origin: typeof lock.vars.origin === "string" ? t(lock.vars.origin) : lock.vars.origin,
          defaultValue: t("config.lock.generic"),
        })}
      </p>
      {index < 0 ? null : (
        <div>
          <Button onClick={() => goToStep(index)}>
            {t("config.lock.jump", { step: t(`config.step.${lock.step}`) })}
          </Button>
        </div>
      )}
    </div>
  );
}

interface StepLayoutProps {
  step: StepId;
  entries: readonly ListEntry[];
  /** Title of the detail pane; usually the selected entry's name. */
  title: string;
  /** The description as prose, at the 70-character measure. */
  description: string;
  meaning?: Meaning;
  /** Anything the step adds under the meaning block (dials, sliders, a table). */
  children?: ReactNode;
  /** Shown instead of the list when the step has no list (world settings, summary). */
  listless?: boolean;
}

/**
 * The shape every configurator step has (SYS-04 v0.2; playtest 2 K1, K5, K6).
 *
 * A list on the left, the detail on the right, both scrolling inside their own frame so the page
 * never does. Clicking the list replaces the detail and nothing else moves, which is what the
 * maintainer asked for after scrolling through nine screens of cards.
 */
export function StepLayout({
  step,
  entries,
  title,
  description,
  meaning,
  children,
  listless,
}: StepLayoutProps): ReactNode {
  const { t } = useTranslation();
  const introSeen = useUiStore((state) => state.introSeen);
  const markIntroSeen = useUiStore((state) => state.markIntroSeen);
  const [forcedIntro, setForcedIntro] = useConfiguratorIntro();
  const showIntro = forcedIntro === step || !introSeen.includes(step);

  return (
    <section className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)]">
      <header className="flex shrink-0 items-baseline gap-2 border-b border-line bg-accent px-2 py-1">
        <h2 className="flex-1 truncate text-sm uppercase tracking-wide text-accentfg">
          {t(`config.step.${step}`)}
        </h2>
        <Tooltip content={t("config.intro.reopen")}>
          <button
            type="button"
            aria-label={t("config.intro.reopen")}
            className="border border-accentfg px-1.5 text-xs text-accentfg hover:bg-accentfg hover:text-accent"
            onClick={() => setForcedIntro(step)}
          >
            ?
          </button>
        </Tooltip>
      </header>

      <div
        className={`grid min-h-0 ${listless === true ? "" : "grid-cols-[minmax(12rem,18rem)_minmax(0,1fr)]"}`}
      >
        {listless === true ? null : (
          <ul className="min-h-0 overflow-auto border-e border-line" data-testid="step-list">
            {entries.map((entry) => {
              const locked = entry.lock != null;
              const row = (
                <button
                  type="button"
                  data-testid={`list-entry-${entry.id}`}
                  data-locked={locked ? "true" : undefined}
                  aria-pressed={entry.selected}
                  onClick={entry.onSelect}
                  className={`flex w-full flex-col items-start gap-0.5 border-s-2 px-2 py-1 text-start ${
                    entry.selected
                      ? "border-s-linestrong bg-accent text-accentfg"
                      : "border-s-transparent hover:bg-panel2"
                  } ${locked ? "opacity-60" : ""}`}
                >
                  <span className="flex w-full items-baseline gap-1">
                    <span className="flex-1 truncate text-sm uppercase tracking-wide">
                      {entry.name}
                    </span>
                    {locked ? (
                      <span aria-hidden className="shrink-0 font-mono text-xs text-crit">
                        =
                      </span>
                    ) : null}
                  </span>
                  <span className="flex w-full items-center gap-2">
                    {entry.visual === undefined ? null : (
                      <span className="shrink-0">{entry.visual}</span>
                    )}
                    <span
                      className={`flex-1 truncate text-xs normal-case ${entry.selected ? "text-accentfg" : "text-muted"}`}
                    >
                      {entry.summary}
                    </span>
                  </span>
                </button>
              );
              return (
                <li key={entry.id}>
                  {entry.tooltip === undefined ? (
                    row
                  ) : (
                    <Tooltip content={entry.tooltip}>{row}</Tooltip>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <div className="flex min-h-0 flex-col gap-3 overflow-auto p-3" data-testid="step-detail">
          <h3 className="text-base uppercase tracking-wide text-fg">{title}</h3>
          {description === "" ? null : <p className="prose text-muted">{description}</p>}
          {meaning === undefined ? null : <MeaningBlock meaning={meaning} />}
          {children}
        </div>
      </div>

      {showIntro ? (
        <IntroWindow
          step={step}
          onClose={() => {
            markIntroSeen(step);
            setForcedIntro(null);
          }}
        />
      ) : null}
    </section>
  );
}

/**
 * Which step's explanation the "?" button asked for, held on the configurator store so that it
 * survives the step's own re-render and is reset when the player leaves the step.
 */
function useConfiguratorIntro(): [StepId | null, (step: StepId | null) => void] {
  const forced = useConfigurator((state) => state.forcedIntro);
  const setForced = useConfigurator((state) => state.setForcedIntro);
  return [forced, setForced];
}
