import type { GameOverView, LogEntry, PlayerView } from "@singularity/core";
import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/Button.js";
import { RevealText } from "../../components/RevealText.js";
import { dayOf, hourOf } from "../../lib/format.js";
import { useGameStore } from "../../store/gameStore.js";
import { useUiStore } from "../../store/uiStore.js";

/** Log entries shown on the ending screen as the story of how the run ended. */
export const GAME_OVER_LOG_ENTRIES = 8;

/**
 * The entries that led here: the tail of the log up to the ending, with the engine's own bookkeeping
 * lines dropped so what is left reads as events, losses and decisions.
 */
export function endingTrail(view: PlayerView, over: GameOverView): LogEntry[] {
  const relevant = view.log.filter((entry) => {
    // Engine diagnostics belong in the log, not in the story of how the run ended.
    return over.tick >= entry.tick && !entry.key.startsWith("dsl.");
  });
  return relevant.slice(-GAME_OVER_LOG_ENTRIES);
}

/** The end of a run, driven by `view.game_over` (SYS-10 endings). */
export function GameOverOverlay({
  over,
  view,
}: {
  over: GameOverView;
  view: PlayerView;
}): ReactNode {
  const { t } = useTranslation();
  const endSession = useGameStore((state) => state.endSession);
  const goTo = useGameStore((state) => state.goTo);
  const openOverlay = useUiStore((state) => state.openOverlay);
  const trail = endingTrail(view, over);
  // The ending covers the screen, so following a log link has to step out of the way first; the
  // run is over either way, and the player can bring the ending back.
  const [minimized, setMinimized] = useState(false);

  const follow = (key?: string): void => {
    openOverlay("log", key);
    setMinimized(true);
  };

  if (minimized) {
    return (
      <div className="pointer-events-auto absolute bottom-3 start-1/2 z-90 -translate-x-1/2">
        <Button variant="primary" onClick={() => setMinimized(false)}>
          {t("gameover.title")}
        </Button>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-90 flex items-center justify-center bg-black/80 p-4">
      <div className="flex max-h-full w-full max-w-lg flex-col gap-3 overflow-auto border border-line bg-panel p-6 text-center">
        <h2 className="text-2xl font-semibold text-fg">{t("gameover.title")}</h2>
        <p className="text-lg text-crit">{t(`gameover.reason.${over.reason}`)}</p>
        <RevealText className="mx-auto text-muted" text={t(over.ending_key, over.vars)} />
        <p className="font-mono text-sm text-fg">{t("gameover.day", { day: dayOf(over.tick) })}</p>

        <section className="text-start">
          <h3 className="mb-1 text-xs uppercase tracking-wide text-muted">
            {t("gameover.what_happened")}
          </h3>
          <ul className="flex flex-col gap-0.5">
            {trail.map((entry) => (
              <li key={`${entry.tick}-${entry.key}-${JSON.stringify(entry.vars)}`}>
                <button
                  type="button"
                  className="flex w-full gap-2 px-1 py-0.5 text-start text-xs hover:bg-panel2"
                  onClick={() => follow(entry.key)}
                >
                  <span className="shrink-0 font-mono text-muted">
                    {t("log.entry_time", { day: dayOf(entry.tick), hour: hourOf(entry.tick) })}
                  </span>
                  <span className="text-fg">{t(entry.key, entry.vars)}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <div className="flex flex-wrap justify-center gap-2">
          <Button onClick={() => follow()}>{t("gameover.open_log")}</Button>
          <Button
            variant="primary"
            onClick={() => {
              endSession();
              goTo("configurator");
            }}
          >
            {t("gameover.restart")}
          </Button>
          <Button onClick={() => endSession()}>{t("gameover.menu")}</Button>
        </div>
      </div>
    </div>
  );
}
