import type { PlayerView } from "@singularity/core";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { dayOf, hourOf } from "../../lib/format.js";
import { logLine } from "../../lib/labels.js";
import { useUiStore } from "../../store/uiStore.js";

/** How many lines the strip shows. Two is the Paradox height: enough for a cause and its effect. */
export const LOG_STRIP_LINES = 2;

/**
 * The log as a strip along the bottom of the map (playtest 3, R8).
 *
 * As a tab it was a wall of text the player had to go and find; the two lines that matter are the
 * two that just happened, and they belong where the player is already looking. Clicking the strip
 * opens the full log as a window, which is where filtering and history live.
 *
 * It is drawn over the map, so it is `pointer-events-auto` inside the overlay layer, and it is
 * narrow enough to leave the map's corners (the legend and the zoom controls) alone.
 */
export function LogStrip({ view }: { view: PlayerView }): ReactNode {
  const { t } = useTranslation();
  const openOverlay = useUiStore((state) => state.openOverlay);
  const entries = view.log.slice(-LOG_STRIP_LINES);

  if (entries.length === 0) {
    return null;
  }

  return (
    <button
      type="button"
      data-testid="log-strip"
      aria-label={t("log.open_full")}
      title={t("log.open_full")}
      onClick={() => openOverlay("log")}
      // The middle column of the screen grid, at its foot: whatever the panels on either side are
      // doing, the strip has the width they leave and no more, so it can no longer run under the
      // selection panel (L8).
      className="pointer-events-auto col-start-2 row-start-2 flex w-full max-w-[44rem] min-w-0 flex-col gap-0.5 self-end justify-self-center border border-line bg-panel/92 px-2 py-0.5 text-start hover:border-linestrong"
    >
      {entries.map((entry) => (
        <span
          key={`${entry.tick}-${entry.key}-${JSON.stringify(entry.vars)}`}
          // One inline flow rather than a flex row (playtest 6, X12): the time is an inline mark at
          // the head of the sentence, so the sentence wraps under it instead of the row breaking
          // into two. The strip is one big button, and a button is drawn in the angular face, but
          // a log line is the model talking to itself, which rule 2 puts in the reading face on
          // the reading ladder; `font-sans` says both, the face by name and the size through the
          // reset in `index.css` that follows it.
          className="block min-w-0 font-sans text-sm"
        >
          {/* `whitespace-normal` undoes the "a figure never breaks" rule for this one mark: it is
            a day and an hour rather than a quantity, and on the narrowest strip the layout allows
            (a pinned interface scale in a 1280 window) it is wider than the strip itself. */}
          <span className="me-2 whitespace-normal font-mono text-xs text-muted">
            {t("log.entry_time", { day: dayOf(entry.tick), hour: hourOf(entry.tick) })}
          </span>
          {/*
           * L7: the line wraps. It used to be cut with an ellipsis, and a log line is a sentence
           * whose end carries the news ("...was cut off for unpaid bills"), so the cut took the
           * half that mattered. The strip holds the last two entries either way.
           *
           * The row wraps too (playtest 6, X12): the timestamp is monospace and never breaks, so
           * on the narrowest strip the layout allows (a pinned interface scale in a 1280 window)
           * the sentence starts under the time rather than pushing the strip past its column.
           */}
          <span className="text-fg">{logLine(t, entry, view)}</span>
        </span>
      ))}
    </button>
  );
}
