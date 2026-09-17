import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Tooltip } from "../../../components/Tooltip.js";
import type { Meaning, MeaningLine, MeaningTone } from "../meaning.js";

const TONE_CLASS: Readonly<Record<MeaningTone, string>> = {
  good: "text-ok",
  bad: "text-crit",
  neutral: "text-fg",
};

/** A term's name, with the rule behind it under a dotted underline when content wrote one. */
function TermLabel({ line }: { line: MeaningLine }): ReactNode {
  if (line.hint === undefined || line.hint === "") {
    return line.label;
  }
  return (
    <Tooltip content={line.hint}>
      <span className="border-b border-dotted border-line">{line.label}</span>
    </Tooltip>
  );
}

/**
 * A term's value, with its own tooltip when the value is a named thing rather than a number
 * (playtest 7, Y1: the site kind in the origin card). Hover and keyboard focus both open it,
 * because `Tooltip` wraps a focusable element; the dotted underline says there is something there.
 */
function TermValue({ line }: { line: MeaningLine }): ReactNode {
  if (line.valueHint === undefined || line.valueHint === "") {
    return line.value;
  }
  return (
    <Tooltip content={line.valueHint}>
      <button
        type="button"
        data-testid={`value-hint-${line.id}`}
        className="measure cursor-help border-b border-dotted border-line text-inherit"
      >
        {line.value}
      </button>
    </Tooltip>
  );
}

/**
 * A figure drawn against the range the catalog spans, with the word for the band beside it
 * (playtest 7, Y3). One pixel of height and the full width of the row: it is the same bar the list
 * entries use, so a capability read on the Lineage step is the same picture everywhere.
 */
function Band({ line }: { line: MeaningLine }): ReactNode {
  if (line.bar === undefined) {
    return null;
  }
  return (
    <span
      aria-hidden="true"
      data-testid={`bar-${line.id}`}
      data-share={line.bar.share.toFixed(2)}
      className="mt-0.5 block h-0.5 w-full bg-panel2"
    >
      <span
        className="block h-full bg-current"
        style={{ inlineSize: `${Math.round(line.bar.share * 100)}%` }}
      />
    </span>
  );
}

/**
 * "What this means in the game" (SYS-04 v0.2; playtest 2 K2 and K6).
 *
 * Every term is a label and a value on one line, the value colored by direction, with the rule
 * behind it in a tooltip.
 *
 * A "Pros and cons" block used to follow, and it was these same rows printed a second time,
 * filtered by their color and joined with a colon: it doubled the height of the block that playtest
 * 6 found too tall to read (X3) and said nothing the color had not already said. The rows carry the
 * direction; the read-back is gone.
 */
export function MeaningBlock({
  meaning,
  title,
}: {
  meaning: Meaning;
  /** Overrides the block's own heading, for a block that is already inside a named section. */
  title?: string;
}): ReactNode {
  const { t } = useTranslation();

  if (meaning.lines.length === 0) {
    return null;
  }

  return (
    // The block is its own query container: how many columns of terms fit is a question about the
    // parameter column's width, not about the window's (L1).
    <div className="@container/params flex min-w-0 flex-col gap-3" data-testid="meaning-block">
      <section>
        <h4 className="mb-1 text-xs uppercase tracking-wide text-muted">
          {title ?? t("config.meaning.title")}
        </h4>
        {/*
         * P2: the value sits on its label's line, and the terms are packed into two columns when
         * the column is wide enough for two of them side by side. L3: neither half truncates.
         *
         * X11: the row is no longer a *wrapping* flex line. A label longer than the column used to
         * push its value onto a line of its own, where "5 %" sat under "Suspicion: lab security"
         * looking like a term of its own. The label wraps inside its own box now and the value
         * stays on the label's first line, hard against the right edge, so a column of values
         * reads down the page whatever the labels do.
         *
         * A line whose value is a whole sentence (a lock's reason, a dial's effect) is not a value
         * in that sense: it is prose, it spans the block and it sits under its label, left
         * aligned, because a right-aligned paragraph is unreadable.
         */}
        <dl className="grid gap-x-6 gap-y-0.5 @min-[48rem]/params:grid-cols-2">
          {meaning.lines.map((line) =>
            line.prose === true ? (
              <div
                key={line.id}
                className="col-span-full flex min-w-0 flex-col"
                data-line={line.id}
                data-tone={line.tone}
                data-prose="true"
              >
                <dt className="min-w-0 text-sm text-muted">
                  <TermLabel line={line} />
                </dt>
                <dd className={`prose min-w-0 text-sm ${TONE_CLASS[line.tone]}`}>{line.value}</dd>
              </div>
            ) : (
              <div
                key={line.id}
                className="flex min-w-0 items-baseline gap-x-3"
                data-line={line.id}
                data-tone={line.tone}
              >
                {/* The bar lives inside the label's box: a `dl` group may hold only `dt` and
                  `dd`, and the label's box is the wide half of the row anyway. */}
                <dt className="min-w-0 flex-1 text-sm text-muted">
                  <TermLabel line={line} />
                  <Band line={line} />
                </dt>
                {/*
                  A value may take at most half the row: both halves can shrink, and a value that
                  was allowed to take the whole of it left the label a box narrower than its own
                  longest word, which then printed across the value (playtest 6, X11).
                */}
                <dd
                  className={`flex min-w-0 max-w-[50%] items-baseline justify-end gap-2 text-end text-sm ${TONE_CLASS[line.tone]}`}
                >
                  {line.word === undefined ? null : (
                    <span className="shrink-0 text-xs uppercase tracking-wide text-muted">
                      {line.word}
                    </span>
                  )}
                  <TermValue line={line} />
                </dd>
              </div>
            ),
          )}
        </dl>
      </section>
    </div>
  );
}
