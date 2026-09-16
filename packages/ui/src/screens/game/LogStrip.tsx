import type { PlayerView } from "@singularity/core";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { dayOf, hourOf } from "../../lib/format.js";
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
      className="pointer-events-auto absolute bottom-2 start-1/2 z-30 flex w-[min(44rem,calc(100%-20rem))] -translate-x-1/2 flex-col gap-0.5 border border-line bg-panel/92 px-2 py-1 text-start hover:border-linestrong"
    >
      {entries.map((entry) => (
        <span
          key={`${entry.tick}-${entry.key}-${JSON.stringify(entry.vars)}`}
          className="flex gap-2 truncate text-sm"
        >
          <span className="shrink-0 font-mono text-xs text-muted">
            {t("log.entry_time", { day: dayOf(entry.tick), hour: hourOf(entry.tick) })}
          </span>
          <span className="truncate text-fg">{t(entry.key, entry.vars)}</span>
        </span>
      ))}
    </button>
  );
}
