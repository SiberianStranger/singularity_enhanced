import { useEffect, useRef } from "react";
import { dayOf } from "../../lib/format.js";
import { AUTOSAVE_ID, putSave } from "../../saves/db.js";
import { useGameStore } from "../../store/gameStore.js";
import { useUiStore } from "../../store/uiStore.js";

/** Autosave every N game days, counted from the view's day (SYS-15, default 3). */
export function useAutosave(): void {
  const tick = useGameStore((state) => state.view?.tick ?? 0);
  const running = useGameStore((state) => state.host !== null);
  const days = useUiStore((state) => state.autosaveDays);
  const busy = useRef(false);

  useEffect(() => {
    if (!running || busy.current) {
      return;
    }
    const { lastAutosaveDay, noteAutosave, setup, saveGame, view } = useGameStore.getState();
    const day = dayOf(tick);
    if (setup === null || view === null || day < lastAutosaveDay + days) {
      return;
    }
    busy.current = true;
    void saveGame()
      .then((data) =>
        putSave({
          id: AUTOSAVE_ID,
          kind: "autosave",
          label: "saves.autosave",
          createdAtIso: new Date().toISOString(),
          seed: setup.seed,
          day,
          tick,
          setup,
          data,
        }),
      )
      .then(() => {
        noteAutosave(day);
      })
      .finally(() => {
        busy.current = false;
      });
  }, [tick, running, days]);
}
