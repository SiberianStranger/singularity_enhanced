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
import { GameOverlays } from "./GameOverlays.js";
import { GameOverOverlay } from "./GameOverOverlay.js";
import { LogStrip } from "./LogStrip.js";
import { OpeningStory } from "./OpeningStory.js";
import { Outliner } from "./Outliner.js";
import { openingSetupOf } from "./opening.js";
import { PrimaryPanel } from "./PrimaryPanel.js";
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

      <div className="@container/screen relative min-h-0 flex-1 overflow-hidden">
        <GameMap
          countries={view.countries}
          markers={markers}
          date={view.date}
          selectedCountry={selection?.kind === "country" ? selection.id : null}
          onSelect={onSelectTarget}
          onContext={onContextTarget}
        />
        {/*
         * The four regions are grid areas, not absolutely positioned cards (playtest 5, L8).
         * Floating each one against a corner meant that as soon as one of them grew the log strip
         * ran under the selection panel and the selection panel ran over the primary panel; a
         * grid cannot do that, because two areas of a grid do not share a cell. The left column is
         * sized by the primary panel, the right by the outliner, and the free middle is the map
         * the player still has to be able to see and click, so the layer keeps `pointer-events`
         * off and every panel turns them back on for itself.
         *
         * Reflow order when the width runs out (L11), stated as container queries on the map
         * region so the interface scale moves the thresholds with everything else: the outliner
         * collapses to its strip first, then the selection panel becomes a sheet across the
         * bottom, then the primary panel takes the whole region.
         */}
        <div
          data-testid="panel-grid"
          className="pointer-events-none absolute inset-0 grid grid-cols-[auto_minmax(0,1fr)_auto] grid-rows-[minmax(0,1fr)_auto_auto] gap-2 overflow-hidden p-2"
        >
          <PrimaryPanel view={view} />
          <SelectionPanel view={view} />
          <Outliner view={view} />
          <LogStrip view={view} />
          {/*
           * The ledger's own button, at the right edge as SYS-11's amendment asks (R10). It is the
           * foot of the right-hand column, one row above the map's own zoom controls, and the
           * outliner above it is capped so that the two cannot meet.
           */}
          <div className="pointer-events-auto col-start-3 row-start-1 self-end justify-self-end">
            <Button
              variant="default"
              hotkey="w"
              registerKey={false}
              data-testid="open-world"
              onClick={() => toggleOverlay("world")}
            >
              {t("panel.world")}
            </Button>
          </div>
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

      {openingPending ? <OpeningStory setup={openingSetupOf(t, view, setup)} /> : null}

      {openingPending || blocking[0] === undefined ? null : (
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
