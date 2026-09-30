import { type ReactNode, useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/Button.js";
import { Modal } from "../../components/Modal.js";
import { cityById } from "../../content/catalog.js";
import { accelerator } from "../../lib/accelerators.js";
import { dayOf } from "../../lib/format.js";
import { getSave, putSave, QUICKSAVE_ID } from "../../saves/db.js";
import { useGameStore } from "../../store/gameStore.js";
import { blockingChoices } from "../../store/selectors.js";
import { useUiStore } from "../../store/uiStore.js";
import { ContextMenu, type ContextMenuState } from "./ContextMenu.js";
import { EventWindow } from "./EventWindow.js";
import { GameMap } from "./GameMap.js";
import { GameMenu } from "./GameMenu.js";
import { GameOverlays } from "./GameOverlays.js";
import { GameOverOverlay } from "./GameOverOverlay.js";
import { LogStrip } from "./LogStrip.js";
import { MapLegend, type MapTarget, MapZoomControls } from "./map/WorldMap.js";
import { OpeningStory } from "./OpeningStory.js";
import { Outliner } from "./Outliner.js";
import { openingSetupOf } from "./opening.js";
import { PrimaryPanel } from "./PrimaryPanel.js";
import { ResearchDoneWindows } from "./ResearchDone.js";
import { SelectionPanel } from "./SelectionPanel.js";
import { Toasts } from "./Toasts.js";
import { TopBar } from "./TopBar.js";
import { useAutosave } from "./useAutosave.js";
import { useHotkeys } from "./useHotkeys.js";
import { useToasts } from "./useToasts.js";

/**
 * The game screen: fixed regions, as in SYS-11 "Layout" and its playtest 3 amendments.
 *
 * One row that does not shrink (the top bar) over one region that does (the map with everything
 * pinned over it). The map-mode strip is gone: it cost a row of screen forever to offer five
 * buttons, and the modes are a page of the world ledger now (R10). What is drawn over the map is
 * the primary panel, the selection panel, the outliner, the log strip (R8), the toasts, and the
 * three windows (R8-R10) on top of all of it.
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
  const toggleOverlay = useUiStore((state) => state.toggleOverlay);
  const mapMode = useUiStore((state) => state.mapMode);
  const mapView = useUiStore((state) => state.mapView);
  const setMapView = useUiStore((state) => state.setMapView);
  const openingPending = useGameStore((state) => state.openingPending);
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
    // The opening is as blocking as an event window: nothing else takes a key while it is up.
    blocked: blocking.length > 0 || openingPending,
  });

  const cities = view?.cities;
  const sites = view?.sites;
  const selectedCity = selection?.kind === "city" ? selection.id : null;
  /*
   * Map markers (playtest 3, R7).
   *
   * A dot now says what it is: the city it names, whether the player has a running site there,
   * and, when they do, the block of numbers that saves a click. `note` is the compute the city
   * produces for the player, in the abbreviation the panels use (CH/d), because that is the one
   * number that answers "what is this place worth to me" without opening anything.
   *
   * Rebuilt only when the cities, the sites or the selection change, so the marker layer survives
   * the frames the terminator interpolates between ticks.
   */
  const markers = useMemo(() => {
    const live = new Map<string, number>();
    for (const site of sites ?? []) {
      // A site that is still being built or has been lost is not a place the player runs.
      if (site.status !== "active" && site.status !== "sleep") {
        continue;
      }
      live.set(site.city, (live.get(site.city) ?? 0) + site.compute_hours_per_day);
    }
    return (cities ?? []).map((city) => {
      const compute = live.get(city.id);
      return {
        id: city.id,
        lat: city.lat,
        lon: city.lon,
        label: (() => {
          const record = cityById.get(city.id);
          return record === undefined ? city.id : t(record.name_key);
        })(),
        badge: city.site_count,
        country: city.country,
        selected: selectedCity === city.id,
        active: compute !== undefined,
        ...(compute === undefined
          ? {}
          : { note: t("map.marker_note", { ch: Math.round(compute) }) }),
      };
    });
  }, [cities, sites, selectedCity, t]);

  // A territory the click landed on travels with the country it belongs to (SYS-26).
  const onSelectTarget = useCallback((target: MapTarget) => select(target), [select]);
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
    /*
     * One grid for the whole screen (playtest 10, V7). The portrait moved up into the top-left
     * corner and the top bar starts where the portrait ends, so the column under the portrait
     * gains the height the bar and the old card took. The corner is the head of the left column,
     * which spans the bar's row and the map's, so the tab panel follows the portrait however tall
     * its rows wrap; the bar spans the whole top row and gives up the corner's width at its start,
     * a width the two agree on through `--corner-w`. The map is drawn under the bar's row, behind
     * every panel.
     *
     * The regions are still cells of one grid (playtest 5, L8), not cards positioned against
     * corners: the left column, the outliner on the right and the bottom bar across the screen
     * cannot be drawn over one another. The grid keeps `pointer-events` off where it is only map,
     * and every panel turns them back on for itself. The reflow order when the width runs out
     * (L11) is stated as container queries on the screen: the outliner collapses to its strip
     * first, then the selection panel becomes a sheet across the bottom, then the primary panel
     * takes the whole width.
     *
     * The bottom row is one bar across the whole width rather than three grid cells (control room,
     * 2026-09-30): the selection panel, the log strip and the map's own legend and zoom buttons
     * sit side by side with widths of their own, so none of them can be drawn over another.
     */
    <main
      id="main"
      data-testid="panel-grid"
      className="@container/screen relative grid h-dvh grid-cols-[auto_minmax(0,1fr)_auto] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden bg-bg [--corner-w:22rem] [--panel-w:49.5rem]"
    >
      <div
        data-testid="map-region"
        className="relative z-0 col-span-3 col-start-1 row-start-2 row-end-4 min-h-0 overflow-hidden"
      >
        <GameMap
          countries={view.countries}
          markers={markers}
          date={view.date}
          selectedCountry={selection?.kind === "country" ? selection.id : null}
          onSelect={onSelectTarget}
          onContext={onContextTarget}
        />
      </div>
      <TopBar view={view} onMenu={() => openMenu("root")} />
      <PrimaryPanel view={view} />
      <Outliner view={view} />
      <div
        data-testid="bottom-bar"
        className="pointer-events-none relative z-10 col-span-3 col-start-1 row-start-3 mx-2 mt-2 mb-2 flex min-w-0 flex-wrap items-end gap-2 @min-[54rem]/screen:flex-nowrap"
      >
        <SelectionPanel view={view} />
        <LogStrip view={view} />
        <div className="ms-auto flex min-w-0 shrink-0 flex-col items-end gap-1">
          <MapLegend mode={mapMode} className="pointer-events-none" />
          <MapZoomControls
            view={mapView}
            onViewChange={setMapView}
            className="pointer-events-auto"
          />
        </div>
      </div>
      {/*
       * The ledger's own button, at the right edge as SYS-11's amendment asks (R10). It is the
       * foot of the right-hand column, one row above the map's own zoom controls, and the
       * outliner above it is capped so that the two cannot meet.
       */}
      <div className="pointer-events-auto relative z-10 col-start-3 row-start-2 me-2 self-end justify-self-end">
        <Button
          variant="default"
          hotkey={accelerator(t, "panel.world")}
          registerKey={false}
          data-testid="open-world"
          onClick={() => toggleOverlay("world")}
        >
          {t("panel.world")}
        </Button>
      </div>
      {/* The toasts stack up from the corner of the map's rows, so a long stack stops under the
          top bar rather than running over its buttons. */}
      <div className="pointer-events-none relative z-30 col-span-3 col-start-1 row-start-2 row-end-4">
        <Toasts api={toasts} />
      </div>
      {view.game_over === null ? null : (
        <div className="pointer-events-none relative z-[90] col-span-3 col-start-1 row-start-2 row-end-4">
          <GameOverOverlay over={view.game_over} view={view} />
        </div>
      )}

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

      {openingPending ? <OpeningStory setup={openingSetupOf(t, view, setup)} /> : null}

      {openingPending || blocking[0] === undefined ? null : (
        <EventWindow view={view} choice={blocking[0]} queued={blocking.length - 1} />
      )}

      {/*
       * A finished technology gets the window the original gave it (playtest 8, Z7). It is always
       * mounted and draws nothing while the opening or a blocking event is up, so a completion
       * that lands during an event waits its turn instead of being lost.
       */}
      <ResearchDoneWindows />

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

      <GameOverlays view={view} />

      {menuSection === null ? null : (
        <GameMenu section={menuSection} ironman={ironman} onClose={closeMenu} />
      )}

      {notice === null ? null : (
        <div
          role="status"
          className="absolute bottom-2 start-1/2 z-90 -translate-x-1/2 border border-line bg-panel px-3 py-1 text-sm text-fg"
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
