import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { toJsDate } from "../../lib/format.js";
import { useGameStore } from "../../store/gameStore.js";
import { clockFace, useSubHour } from "./useSmoothClock.js";

/**
 * Date and a running clock, as the original game's "DAY 0000, 00:00:30" had (playtest 1, U10).
 *
 * The simulation has no seconds; they are interpolated from the wall clock and the current speed
 * (`useSubHour`), which is the same phase the day/night terminator slides with, so the two never
 * disagree. Paused freezes them and reduced motion snaps them to the hour.
 *
 * It subscribes to the store itself instead of taking the view as a prop, so the frames it draws
 * between ticks re-render this one span rather than the whole alert bar.
 */
export function GameClock(): ReactNode {
  const { t } = useTranslation();
  const date = useGameStore((state) => state.view?.date);
  const subHour = useSubHour(30);

  if (date === undefined) {
    return null;
  }
  const face = clockFace(date.hour, subHour);
  const clock = { hour: face.hour, minute: face.minute, second: face.second };

  return (
    <span className="flex items-baseline gap-2">
      {/* `data-iso` is the unformatted date: locale-independent, and what the smoke test reads. */}
      <span className="font-mono text-sm text-fg" data-testid="game-date" data-iso={date.iso}>
        {t("game.date_full", { date: toJsDate(date) })}
      </span>
      <span className="font-mono text-xs text-muted" data-testid="game-clock">
        {t("game.clock", clock)}
      </span>
    </span>
  );
}
