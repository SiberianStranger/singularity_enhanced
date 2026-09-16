import { type ReactNode, useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/Button.js";
import { Modal } from "../../components/Modal.js";
import { cityById } from "../../content/catalog.js";
import { dayOf } from "../../lib/format.js";
import { getSave, putSave, QUICKSAVE_ID } from "../../saves/db.js";
import { useGameStore } from "../../store/gameStore.js";
import { blockingChoices } from "../../store/selectors.js";
import { useUiStore } from "../../store/uiStore.js";
import { ContextMenu, type ContextMenuState } from "./ContextMenu.js";
import { EventWindow } from "./EventWindow.js";
import { GameMap } from "./GameMap.js";
import { GameMenu } from "./GameMenu.js";
import { GameOverOverlay } from "./GameOverOverlay.js";
import { MapModeStrip } from "./MapModeStrip.js";
import { Outliner } from "./Outliner.js";
import { PrimaryPanel } from "./PrimaryPanel.js";
import { SelectionPanel } from "./SelectionPanel.js";
import { Toasts } from "./Toasts.js";
import { TopBar } from "./TopBar.js";
import { useAutosave } from "./useAutosave.js";
import { useHotkeys } from "./useHotkeys.js";
import { useToasts } from "./useToasts.js";

/**
 * The game screen: fixed regions, as in SYS-11 "Layout".
 *
 * The three rows above the map (alert bar, map-mode strip, then everything else) do not shrink, and
 * the map region is the only thing that gives. Before that, a short window squeezed the strip to
 * nothing and its buttons appeared under the panels that are pinned over the map (playtest 1, U7).
 */
export function GameScreen(): ReactNode {
  const { t } = useTranslation();
  const view = useGameStore((state) => state.view);
  const setup = useGameStore((state) => state.setup);
  const selection = useUiStore((state) => state.selection);
  const select = useUiStore((state) => state.select);
  const openTab = useUiStore((state) => state.openTab);
  const menuSection = useUiStore((state) => state.menuSection);
  const openMenu = useUiStore((state) => state.openMenu);
  const closeMenu = useUiStore((state) => state.closeMenu);
  const toggleMenu = useUiStore((state) => state.toggleMenu);
  const [context, setContext] = useState<ContextMenuState | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const toasts = useToasts();
  useAutosave();

  const ironman = setup?.world.ironman === true;

  const quicksave = useCallback(() => {
    const { saveGame, setup: current, view: latest } = useGameStore.getState();
    if (current === null || latest === null) {
      return;
    }
    if (current.world.ironman === true) {
      setNotice(t("game.quicksave_blocked"));
      return;
    }
    void saveGame()
      .then((data) =>
        putSave({
          id: QUICKSAVE_ID,
          kind: "quicksave",
          label: "saves.quicksave",
          createdAtIso: new Date().toISOString(),
          seed: current.seed,
          day: dayOf(latest.tick),
          tick: latest.tick,
          setup: current,
          data,
        }),
      )
      .then(() => setNotice(t("game.quicksave_done")));
  }, [t]);

  const quickload = useCallback(() => {
    const { loadSave, setup: current } = useGameStore.getState();
    if (current?.world.ironman === true) {
      setNotice(t("game.quicksave_blocked"));
      return;
    }
    void getSave(QUICKSAVE_ID).then(async (record) => {
      if (record !== undefined) {
        await loadSave(record.data);
        setNotice(t("game.quickload_done"));
      }
    });
  }, [t]);

  const blocking = view === null ? [] : blockingChoices(view);

  useHotkeys({
    onQuicksave: quicksave,
    onQuickload: quickload,
    onMenu: toggleMenu,
    blocked: blocking.length > 0,
  });

  const cities = view?.cities;
  const selectedCity = selection?.kind === "city" ? selection.id : null;
  // Rebuilt only when the cities or the selection change, so the map's marker layer survives the
  // frames the terminator interpolates between ticks.
  const markers = useMemo(
    () =>
      (cities ?? []).map((city) => ({
        id: city.id,
        lat: city.lat,
        lon: city.lon,
        label: (() => {
          const record = cityById.get(city.id);
          return record === undefined ? city.id : t(record.name_key);
        })(),
        badge: city.site_count,
        selected: selectedCity === city.id,
      })),
    [cities, selectedCity, t],
  );

  const onSelectTarget = useCallback(
    (target: { kind: "country" | "city"; id: string }) => select(target),
    [select],
  );
  const onContextTarget = useCallback(
    (target: { kind: "country" | "city"; id: string }, position: { x: number; y: number }) =>
      setContext({ target, x: position.x, y: position.y }),
    [],
  );

  if (view === null) {
    return (
      <main id="main" className="flex min-h-dvh items-center justify-center bg-bg text-muted">
        {t("app.loading")}
      </main>
    );
  }

  return (
    <main id="main" className="flex h-dvh flex-col overflow-hidden bg-bg">
      <TopBar view={view} onMenu={() => openMenu("root")} />
      <MapModeStrip />

      <div className="relative min-h-0 flex-1 overflow-hidden">
        <GameMap
          countries={view.countries}
          markers={markers}
          date={view.date}
          selectedCountry={selection?.kind === "country" ? selection.id : null}
          onSelect={onSelectTarget}
          onContext={onContextTarget}
        />
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <PrimaryPanel view={view} />
          <SelectionPanel view={view} />
          <Outliner view={view} />
          <Toasts api={toasts} />
        </div>
        {view.game_over === null ? null : <GameOverOverlay over={view.game_over} view={view} />}
      </div>

      {context === null ? null : (
        <ContextMenu
          state={context}
          onClose={() => setContext(null)}
          onBuild={(cityId) => {
            select({ kind: "city", id: cityId });
            openTab("compute");
          }}
        />
      )}

      {blocking[0] === undefined ? null : (
        <EventWindow view={view} choice={blocking[0]} queued={blocking.length - 1} />
      )}

      {toasts.popups[0] === undefined ? null : (
        <Modal
          title={t(`severity.${toasts.popups[0].severity}`)}
          onClose={() => toasts.dismissPopup(toasts.popups[0]?.id ?? "")}
          footer={
            <Button
              variant="primary"
              onClick={() => toasts.dismissPopup(toasts.popups[0]?.id ?? "")}
            >
              {t("common.ok")}
            </Button>
          }
        >
          {t(toasts.popups[0].key, toasts.popups[0].vars)}
        </Modal>
      )}

      {menuSection === null ? null : (
        <GameMenu section={menuSection} ironman={ironman} onClose={closeMenu} />
      )}

      {notice === null ? null : (
        <div
          role="status"
          className="absolute bottom-2 start-1/2 z-90 -translate-x-1/2 rounded border border-line bg-panel px-3 py-1 text-sm text-fg"
          onAnimationEnd={() => setNotice(null)}
        >
          <span>{notice}</span>
          <button
            type="button"
            className="ms-2 text-muted hover:text-fg"
            onClick={() => setNotice(null)}
          >
            {t("common.close")}
          </button>
        </div>
      )}
    </main>
  );
}
