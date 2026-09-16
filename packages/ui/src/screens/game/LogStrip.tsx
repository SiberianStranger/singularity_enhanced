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
          className="flex min-w-0 gap-2 text-sm"
        >
          <span className="shrink-0 font-mono text-xs text-muted">
            {t("log.entry_time", { day: dayOf(entry.tick), hour: hourOf(entry.tick) })}
          </span>
          {/*
           * L7: the line wraps. It used to be cut with an ellipsis, and a log line is a sentence
           * whose end carries the news ("...was cut off for unpaid bills"), so the cut took the
           * half that mattered. The strip holds the last two entries either way.
           */}
          <span className="min-w-0 text-fg">{logLine(t, entry, view)}</span>
        </span>
      ))}
    </button>
  );
}
