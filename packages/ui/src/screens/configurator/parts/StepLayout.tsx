import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../components/Button.js";
import { Frame } from "../../../components/Frame.js";
import { Modal } from "../../../components/Modal.js";
import { Tooltip } from "../../../components/Tooltip.js";
import { bundleKey } from "../../../content/strings.js";
import { accelerator } from "../../../lib/accelerators.js";
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
  /**
   * The summary is a sentence rather than a figure, so it is drawn in the reading face. The
   * angular face is caps-only by design (style guide, "Sizes and reveal"), which is right for
   * "40k USD" and wrong for "for a player who has never played".
   */
  summaryProse?: boolean;
  /** Hover tooltip; the whole point of playtest 2 K6 ("tooltips on everything"). */
  tooltip?: ReactNode;
  /** Set when an earlier step makes this entry unavailable; the detail explains it. */
  lock?: Lock | null;
  /**
   * Already localized reason this entry cannot be chosen *on this step*, as a quirk outside the
   * budget is. A lock points at another step; this one does not, so it is shown on the row itself.
   */
  unavailable?: string | undefined;
  selected: boolean;
  /**
   * Heading this entry sits under. Entries are drawn in the order given, and a heading is printed
   * whenever it changes, so a step that offers two tiers of the same thing (the Location step's
   * typical cities and everywhere else) is one list rather than two.
   */
  group?: string;
  onSelect(): void;
}

/**
 * The explanation window each step opens with (playtest 2, K6).
 *
 * It is shown once per browser per step and can be brought back from the "?" in the step header,
 * which is where a player looks for it. What has been seen lives in the UI store, so it survives a
 * reload and is not part of a save: a new game does not re-explain the configurator to someone who
 * has played five.
 *
 * Its accelerator is a letter of its own label that the rail behind it does not already claim (T
 * of "goT it" in English, Т of "поняТно" in Russian): two controls on screen at once may not share
 * a letter (style guide rule 4).
 */
function IntroWindow({ step, onClose }: { step: StepId; onClose: () => void }): ReactNode {
  const { t } = useTranslation();
  // Content writes this paragraph (`configurator.intro.<step>`); the client's own is the fallback
  // for a bundle built before it did.
  const body = t(bundleKey(`configurator.intro.${step}`, `config.intro.${step}`), {
    defaultValue: "",
  });

  if (body === "") {
    return null;
  }

  return (
    <Modal
      title={t(`config.step.${step}`)}
      onClose={onClose}
      footer={
        <Button variant="primary" hotkey={accelerator(t, "config.intro.got_it")} onClick={onClose}>
          {t("config.intro.got_it")}
        </Button>
      }
    >
      <p className="prose" data-testid="config-intro" data-step={step}>
        {body}
      </p>
    </Modal>
  );
}

/**
 * What a choice changed besides itself, with the way back (playtest 4, P3).
 *
 * Choosing a locked lineage moves its prerequisites rather than refusing, so the player has to be
 * told: one line naming each step that moved and what it holds now, and an Undo that puts the whole
 * draft back. It is shown only on the step where the choice was made, so walking away from it
 * clears it.
 */
function FixNote({ step }: { step: StepId }): ReactNode {
  const { t } = useTranslation();
  const fix = useConfigurator((state) => state.fix);
  const undoFix = useConfigurator((state) => state.undoFix);

  if (fix === null || fix.step !== step) {
    return null;
  }

  /*
   * X7: the Russian used to read "Поколение на Сбежавший передний край", which puts a name into a
   * slot that governs a case it cannot take. The item is a frame now: the step's name as it reads
   * inside a sentence, a colon, and the value in guillemets, so the substituted name stands in the
   * nominative (SYS-14 "A substituted name never declines"). A language that needs no separate
   * in-sentence form of a step name simply does not write the `.inline` key.
   */
  const changes = fix.changes
    .map((change) =>
      t("config.fix.item", {
        step: t(`config.step.${change.step}.inline`, {
          defaultValue: t(`config.step.${change.step}`),
        }),
        value: t(change.nameKey),
      }),
    )
    .join(t("config.fix.separator", { defaultValue: ", " }));

  return (
    <div
      data-testid="fix-note"
      data-fix-steps={fix.changes.map((change) => change.step).join(" ")}
      className="flex flex-wrap items-baseline gap-2 border border-warn bg-panel2 px-2 py-1"
    >
      <span className="text-sm text-warn">{t("config.fix.changed", { changes })}</span>
      <Button onClick={undoFix}>{t("config.fix.undo")}</Button>
    </div>
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
  /**
   * The three sentences of the guidance layer (playtest 7, Y3), printed under the description and
   * before the numbers: "Pick this if ...", "Avoid it if ...", "Like <entry>, but ...".
   */
  guidance?: ReactNode;
  /**
   * Prose that belongs with the description rather than with the parameters: the origin's summary
   * in the model's voice, its strengths and its problems (playtest 6, X4). It is printed under the
   * description, inside the text column, which is what that column's empty half is for.
   */
  aside?: ReactNode;
  /** A control above the list, inside its frame and outside its scroll (a filter box). */
  listHeader?: ReactNode;
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
  guidance,
  aside,
  listHeader,
  children,
  listless,
}: StepLayoutProps): ReactNode {
  const { t } = useTranslation();
  const introSeen = useUiStore((state) => state.introSeen);
  const markIntroSeen = useUiStore((state) => state.markIntroSeen);
  const [forcedIntro, setForcedIntro] = useConfiguratorIntro();
  const showIntro = forcedIntro === step || !introSeen.includes(step);

  return (
    <Frame
      // The step is a panel like every other, so its header bar is the shared one (style guide
      // rule 1) rather than a second copy of the same class list.
      title={t(`config.step.${step}`)}
      bordered={false}
      className="min-h-0"
      // L2: the list only has to hold two lines of a name, so its maximum came back from 23rem to
      // 18rem and the freed width went to the detail, where the parameters live. Both tracks are
      // `minmax(...,...)` with a shrinkable minimum, so neither can push the frame wider.
      bodyClassName={`grid min-w-0 ${listless === true ? "" : "grid-cols-[minmax(11rem,18rem)_minmax(0,1fr)]"}`}
      actions={
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
      }
    >
      {listless === true ? null : (
        <div className="flex min-h-0 min-w-0 flex-col border-e border-line">
          {listHeader === undefined ? null : (
            <div className="shrink-0 border-b border-line p-1">{listHeader}</div>
          )}
          <ul className="min-h-0 overflow-auto" data-testid="step-list">
            {entries.map((entry, index) => {
              const locked = entry.lock != null || entry.unavailable !== undefined;
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
                    {/* Wraps rather than truncating: a name the player cannot read in full is the
                      finding, and a second line costs less than a cut-off family name (P1). */}
                    <span className="flex-1 text-sm uppercase leading-tight tracking-wide">
                      {entry.name}
                    </span>
                    {locked ? (
                      <span aria-hidden className="shrink-0 font-mono text-xs text-crit">
                        =
                      </span>
                    ) : null}
                  </span>
                  {/* X12: the row wraps, so the visual summary and the line beside it stack when
                    the column is too narrow for both. Russian prints "40 тыс. $" with
                    non-breaking spaces, which cannot be broken, so without this the widest
                    unbreakable pair set the list's minimum width and the column overflowed. */}
                  <span className="flex w-full flex-wrap items-center gap-x-2">
                    {entry.visual === undefined ? null : (
                      <span className="shrink-0">{entry.visual}</span>
                    )}
                    {/* L3: only the footer build line truncates; a summary too long for the
                      column wraps onto a second line. */}
                    <span
                      className={`min-w-0 flex-1 text-xs normal-case ${entry.summaryProse === true ? "measure" : ""} ${entry.selected ? "text-accentfg" : "text-muted"}`}
                    >
                      {entry.summary}
                    </span>
                  </span>
                  {entry.unavailable === undefined ? null : (
                    <span className="w-full min-w-0 text-xs normal-case text-crit">
                      {entry.unavailable}
                    </span>
                  )}
                </button>
              );
              const heading =
                entry.group !== undefined && entry.group !== entries[index - 1]?.group
                  ? entry.group
                  : null;
              return (
                <li key={entry.id}>
                  {heading === null ? null : (
                    <h4 className="border-b border-line bg-panel2 px-2 py-0.5 text-xs uppercase tracking-wide text-muted">
                      {heading}
                    </h4>
                  )}
                  {entry.tooltip === undefined ? (
                    row
                  ) : (
                    <Tooltip content={entry.tooltip}>{row}</Tooltip>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div
        className="@container/detail flex min-h-0 min-w-0 flex-col gap-3 overflow-auto p-3"
        data-testid="step-detail"
      >
        <h3 className="min-w-0 text-base uppercase tracking-wide text-fg">{title}</h3>
        <FixNote step={step} />
        {/*
         * X3, X4: two columns, the text at 45% and the parameters at 55% (9fr to 11fr, which is
         * the ratio measured in the browser: at 1280 by 720 in Russian it is the one that leaves
         * both columns ending within a line or two of each other on every origin). The playtest 5
         * version gave the text `minmax(0,70ch)` and the parameters whatever was left, which put a
         * paragraph of four lines beside a column of twenty and made the card scroll on the side
         * that could least afford it. The text column is the narrower one now and carries the
         * origin's own voice under the description (`aside`), so both columns end at about the
         * same place and the parameter rows have room for a long label and its value on one line.
         *
         * The switch is a container query on the pane, not on the viewport, so the pane's own
         * width decides; below it the two stack with the parameters first. A step with no
         * parameters (the summary) keeps one column at the 70-character measure.
         */}
        <div
          data-testid="detail-split"
          className={`grid min-w-0 gap-x-6 gap-y-3 ${
            meaning === undefined
              ? ""
              : "@min-[36rem]/detail:grid-cols-[minmax(0,9fr)_minmax(0,11fr)]"
          }`}
        >
          {description === "" && guidance === undefined && aside === undefined ? null : (
            <div className="flex min-w-0 flex-col gap-3">
              {description === "" ? null : (
                <p data-testid="detail-text" className="prose min-w-0 max-w-[70ch] text-muted">
                  {description}
                </p>
              )}
              {guidance}
              {aside}
            </div>
          )}
          {meaning === undefined ? null : (
            <div
              data-testid="detail-params"
              className="order-first min-w-0 @min-[36rem]/detail:order-none"
            >
              <MeaningBlock meaning={meaning} />
            </div>
          )}
        </div>
        {children}
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
    </Frame>
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
