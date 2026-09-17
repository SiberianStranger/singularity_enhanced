/**
 * UI-only state (SYS-11 "Layout"): which primary tab is pinned top-left, what the map selection is,
 * whether the outliner is open, theme, interface scale, language, message settings and the map mode.
 * Persisted to localStorage, never to a save.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

/** Counter behind notice ids: the client never needs randomness for a list key. */
let noticeSeq = 0;

/**
 * Tabs of the pinned primary panel, in strip order (SYS-11 "Layout amendments after playtest 3").
 *
 * Log, Knowledge and World left this strip: the log is a strip at the bottom of the map, knowledge
 * opens from the top-right corner, and the world ledger is a centered window. All three are things
 * the player consults rather than plays out of, and a tab for each was three tabs scrolled past.
 */
export const PRIMARY_TABS = [
  "overview",
  "compute",
  "research",
  "finances",
  "detection",
  "operations",
  "journal",
] as const;
export type PrimaryTab = (typeof PRIMARY_TABS)[number];

/**
 * Windows drawn over the map rather than pinned beside it (playtest 3, R8-R10). One at a time: a
 * ledger on top of a log on top of the map is a stack nobody asked for.
 */
export const OVERLAYS = ["log", "knowledge", "world"] as const;
export type Overlay = (typeof OVERLAYS)[number];

/**
 * Sections of the menu overlay (the Menu button and Escape). Settings and message settings live
 * here rather than as game panels: they are not part of playing, and a panel tab for them is a tab
 * the player scrolls past forever (playtest 1, U5).
 */
export const MENU_SECTIONS = ["root", "save", "load", "settings", "messages", "about"] as const;
export type MenuSection = (typeof MENU_SECTIONS)[number];

/**
 * Panel and window accelerators (SYS-11; playtest 3 R8-R10; playtest 6 X13).
 *
 * The letters are not here any more. Each tab and each window is keyed by a letter of its own name
 * in the language on screen, which lives in the locale beside that name (`panel.compute.key`), so
 * this is only the list of things that have one. `useHotkeys` resolves the letters through
 * `accelerator()` and matches both the letter itself and the physical key it sits on.
 *
 * The `A` that used to be a second key for Detection is gone with the table: an alias nobody
 * documented cannot be kept unique across two languages, and Detection answers its own letter.
 */
export const KEYED_TABS: readonly PrimaryTab[] = [
  "overview",
  "compute",
  "research",
  "finances",
  "detection",
  "operations",
  "journal",
];

/** The label key each tab and window is named and keyed by. */
export function panelLabelKey(entry: PrimaryTab | Overlay): string {
  return `panel.${entry}`;
}

export type SelectionKind = "country" | "city" | "site";

export interface Selection {
  kind: SelectionKind;
  id: string;
}

export type MessageMode = "popup_and_pause" | "popup" | "toast" | "icon_only" | "log_only";
export type MessagePreset = "quiet" | "default" | "verbose";
/**
 * The three themes of the style guide: the original's blue (default), the legacy night mode in
 * dark gray and amber, and the flat "Vector" look. Light mode is not a goal.
 */
export const THEMES = ["default", "night", "vector"] as const;
export type Theme = (typeof THEMES)[number];
/** "original" is the legacy game's angular face on labels and numbers; "plain" is the text face. */
export type FontFace = "original" | "plain";
/**
 * Interface scale, as a multiplier on the root font size (playtest 3, R13).
 *
 * Small/Normal/Large was three steps where the maintainer wanted a dial: the setting is a number
 * between `UI_SCALE_MIN` and `UI_SCALE_MAX` now, and because everything in the client is sized in
 * rem, moving it scales the tables, the panels and the angular labels together.
 */
export const UI_SCALE_MIN = 0.7;
export const UI_SCALE_MAX = 1.3;
export const UI_SCALE_STEP = 0.05;

/**
 * The window the client's layout is drawn for, in CSS pixels at scale 1 (playtest 5, L11).
 *
 * Every panel, rail and column is sized in rem against this, so "does the layout fit" is one
 * division rather than a judgement: at scale `s` the client has `width / s` by `height / s` design
 * pixels to lay itself out in, and it fits while that is at least this.
 */
export const DESIGN_WIDTH = 1280;
export const DESIGN_HEIGHT = 720;

/**
 * The largest scale at which the design still fits the window (playtest 5, L12).
 *
 * This is the "auto" the interface-scale setting starts on, and it is what the maintainer was
 * doing by hand with the browser's zoom: a 1500 by 800 window gets 1.15, a 1920 by 1080 one the
 * 1.3 ceiling, and a window narrower than the design shrinks the interface until it fits rather
 * than pushing half of it off the edge. It snaps *down* onto the slider's 5% grid, because a step
 * up from a scale that fits is a scale that does not.
 */
export function autoUiScale(width: number, height: number): number {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return 1;
  }
  const fits = Math.min(width / DESIGN_WIDTH, height / DESIGN_HEIGHT);
  const stepped = Math.floor(fits / UI_SCALE_STEP) * UI_SCALE_STEP;
  return Math.min(UI_SCALE_MAX, Math.max(UI_SCALE_MIN, Math.round(stepped * 100) / 100));
}

/** A second, smaller dial for the angular face alone, for a player who finds it hard to read. */
export const DISPLAY_SCALE_MIN = 0.85;
export const DISPLAY_SCALE_MAX = 1.3;
/**
 * What the map paints a country by (SYS-01 M2 contract "Views").
 *
 * Ten of them are numbers the world ledger also prints as a column, so the ledger's map-mode button
 * beside a column and the mode the map is in are the same thing; two are categories (the stance a
 * government holds toward AI and the kind of government it is), which the map draws from a table of
 * hues with a legend rather than as a scale.
 */
export type MapMode =
  | "presence"
  | "awareness"
  | "opinion"
  | "regulation"
  | "enforcement"
  | "power_price"
  | "kyc"
  | "stability"
  | "cloud_availability"
  | "hardware_availability"
  | "stance"
  | "government";

/** The two modes whose values are names rather than a scale; the legend lists their categories. */
export const CATEGORICAL_MAP_MODES: readonly MapMode[] = ["stance", "government"];
/** The textured map draws the geographic rasters under the vector layer; "vector" is the old look. */
export type MapStyle = "textured" | "vector";

/**
 * Where the map is looking: the top-left corner of the view box and the zoom (playtest 3, R14).
 *
 * It is session state, not a setting: it lives in the store so that opening a window, switching a
 * panel or collapsing the outliner does not throw the player back to the middle of the Atlantic,
 * and it is left out of `partialize` so a new session starts on the whole world.
 */
export interface MapView {
  x: number;
  y: number;
  k: number;
}

export const INITIAL_MAP_VIEW: MapView = { x: 0, y: 0, k: 1 };

/** A message the client itself raises, such as the reason a command was refused. */
export interface Notice {
  id: string;
  key: string;
  vars: Record<string, string | number | boolean>;
  tone: "info" | "error";
  /** How many times this same message arrived in a row; 1 unless it repeated. */
  count: number;
}

export const MESSAGE_MODES: readonly MessageMode[] = [
  "popup_and_pause",
  "popup",
  "toast",
  "icon_only",
  "log_only",
];

export const MAP_MODES: readonly MapMode[] = [
  "presence",
  "awareness",
  "opinion",
  "regulation",
  "enforcement",
  "stance",
  "government",
  "stability",
  "kyc",
  "power_price",
  "cloud_availability",
  "hardware_availability",
];

/** Volume sliders are stored as fractions; the mute flags are kept apart so a mute keeps the level. */
export interface AudioSettings {
  music_volume: number;
  music_muted: boolean;
  sfx_volume: number;
  sfx_muted: boolean;
}

export const DEFAULT_AUDIO: AudioSettings = {
  music_volume: 0.5,
  music_muted: false,
  sfx_volume: 0.6,
  sfx_muted: false,
};

/** What the three old named sizes meant, so a browser that stored one lands on the same scale. */
export const LEGACY_TEXT_SCALE: Readonly<Record<string, number>> = {
  small: 0.9,
  normal: 1,
  large: 1.15,
};

/** Clamps a scale onto the 5% grid the slider offers, so a stored value is always a valid step. */
export function clampScale(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return 1;
  }
  const snapped = Math.round(value / UI_SCALE_STEP) * UI_SCALE_STEP;
  return Math.min(max, Math.max(min, Math.round(snapped * 100) / 100));
}

interface UiStore {
  theme: Theme;
  uiScale: number;
  /** True while the scale follows the window instead of the slider (playtest 5, L12). */
  uiScaleAuto: boolean;
  displayScale: number;
  fontFace: FontFace;
  language: string;
  /** The pinned primary panel: open or collapsed, and which tab it shows. */
  primaryOpen: boolean;
  primaryTab: PrimaryTab;
  /** Entity the open tab should scroll to, set by alert links and outliner jumps. */
  focusId: string | null;
  outlinerOpen: boolean;
  selection: Selection | null;
  /** The selection panel shrinks to its title bar rather than covering the map corner. */
  selectionCollapsed: boolean;
  mapMode: MapMode;
  mapStyle: MapStyle;
  mapView: MapView;
  /** Optional CRT overlay (scanlines and a vignette), off by default (style guide rule 9). */
  crt: boolean;
  audio: AudioSettings;
  /** Configurator steps whose explanation window has been shown once in this browser (K6). */
  introSeen: string[];
  /** Open section of the menu overlay; null when the overlay is closed. */
  menuSection: MenuSection | null;
  /** The window drawn over the map (log, knowledge, world); null when none is open. */
  overlay: Overlay | null;
  /** Log key the log window should filter on when an alert link opened it. */
  overlayFocus: string | null;
  /** Client-raised messages (refused commands); never persisted. */
  notices: Notice[];
  messagePreset: MessagePreset;
  /**
   * Whether a finished technology opens its own window (playtest 8, Z7). Off, it is a toast like
   * any other alert, which is what a player who reads the Research tab anyway will want.
   */
  techWindow: boolean;
  /** Per alert key override of the preset; only keys the player touched are stored. */
  messageModes: Record<string, MessageMode>;
  /** Alert keys seen this session, so the settings tab can list them. */
  seenAlertKeys: string[];
  autosaveDays: number;

  setTheme(theme: Theme): void;
  setUiScale(scale: number): void;
  setUiScaleAuto(auto: boolean): void;
  /** What the auto mode writes; unlike `setUiScale` it does not switch auto off. */
  setUiScaleFromWindow(scale: number): void;
  setDisplayScale(scale: number): void;
  setFontFace(face: FontFace): void;
  setLanguage(language: string): void;
  openTab(tab: PrimaryTab, focusId?: string): void;
  toggleTab(tab: PrimaryTab): void;
  closePrimary(): void;
  select(selection: Selection | null): void;
  setSelectionCollapsed(collapsed: boolean): void;
  setOutliner(open: boolean): void;
  setMapMode(mode: MapMode): void;
  setMapStyle(style: MapStyle): void;
  setMapView(view: MapView): void;
  setCrt(on: boolean): void;
  setAudio(patch: Partial<AudioSettings>): void;
  markIntroSeen(step: string): void;
  resetIntros(): void;
  openMenu(section?: MenuSection): void;
  closeMenu(): void;
  toggleMenu(): void;
  openOverlay(overlay: Overlay, focus?: string): void;
  closeOverlay(): void;
  toggleOverlay(overlay: Overlay): void;
  pushNotice(key: string, vars?: Notice["vars"], tone?: Notice["tone"]): void;
  dismissNotice(id: string): void;
  setMessagePreset(preset: MessagePreset): void;
  setTechWindow(on: boolean): void;
  setMessageMode(key: string, mode: MessageMode): void;
  resetMessageModes(): void;
  noteAlertKey(key: string): void;
}

export const useUiStore = create<UiStore>()(
  persist(
    (set, get) => ({
      theme: "default",
      uiScale: 1,
      uiScaleAuto: true,
      displayScale: 1,
      fontFace: "original",
      language: "en",
      primaryOpen: true,
      primaryTab: "overview",
      focusId: null,
      outlinerOpen: true,
      selection: null,
      selectionCollapsed: false,
      mapMode: "presence",
      mapStyle: "textured",
      mapView: { ...INITIAL_MAP_VIEW },
      crt: false,
      audio: { ...DEFAULT_AUDIO },
      introSeen: [],
      menuSection: null,
      overlay: null,
      overlayFocus: null,
      notices: [],
      messagePreset: "default",
      techWindow: true,
      messageModes: {},
      seenAlertKeys: [],
      autosaveDays: 3,

      setTheme(theme) {
        set({ theme });
      },
      setUiScale(scale) {
        // Moving the slider is the player taking the wheel: auto stops steering.
        set({ uiScale: clampScale(scale, UI_SCALE_MIN, UI_SCALE_MAX), uiScaleAuto: false });
      },
      setUiScaleAuto(uiScaleAuto) {
        set({ uiScaleAuto });
      },
      setUiScaleFromWindow(scale) {
        const next = clampScale(scale, UI_SCALE_MIN, UI_SCALE_MAX);
        if (get().uiScale !== next) {
          set({ uiScale: next });
        }
      },
      setDisplayScale(scale) {
        set({ displayScale: clampScale(scale, DISPLAY_SCALE_MIN, DISPLAY_SCALE_MAX) });
      },
      setFontFace(fontFace) {
        set({ fontFace });
      },
      setLanguage(language) {
        set({ language });
      },
      openTab(tab, focusId) {
        set({ primaryOpen: true, primaryTab: tab, focusId: focusId ?? null });
      },
      toggleTab(tab) {
        const state = get();
        if (state.primaryOpen && state.primaryTab === tab) {
          set({ primaryOpen: false });
        } else {
          set({ primaryOpen: true, primaryTab: tab, focusId: null });
        }
      },
      closePrimary() {
        set({ primaryOpen: false });
      },
      select(selection) {
        set({ selection, selectionCollapsed: false });
      },
      setSelectionCollapsed(selectionCollapsed) {
        set({ selectionCollapsed });
      },
      setOutliner(outlinerOpen) {
        set({ outlinerOpen });
      },
      setMapMode(mapMode) {
        set({ mapMode });
      },
      setMapStyle(mapStyle) {
        set({ mapStyle });
      },
      setMapView(mapView) {
        set({ mapView });
      },
      setCrt(crt) {
        set({ crt });
      },
      setAudio(patch) {
        set({ audio: { ...get().audio, ...patch } });
      },
      markIntroSeen(step) {
        const seen = get().introSeen;
        if (!seen.includes(step)) {
          set({ introSeen: [...seen, step] });
        }
      },
      resetIntros() {
        set({ introSeen: [] });
      },
      openMenu(section = "root") {
        set({ menuSection: section });
      },
      closeMenu() {
        set({ menuSection: null });
      },
      toggleMenu() {
        set({ menuSection: get().menuSection === null ? "root" : null });
      },
      openOverlay(overlay, focus) {
        set({ overlay, overlayFocus: focus ?? null });
      },
      closeOverlay() {
        set({ overlay: null, overlayFocus: null });
      },
      toggleOverlay(overlay) {
        const open = get().overlay === overlay;
        set({ overlay: open ? null : overlay, overlayFocus: null });
      },
      pushNotice(key, vars = {}, tone = "error") {
        const notices = get().notices;
        const last = notices.at(-1);
        // The same refusal twice running is one message with a count, not two messages (playtest
        // 8, Z2). A drag that the engine refuses at every step used to fill the stack with
        // identical lines, which said nothing the first line had not already said.
        if (
          last !== undefined &&
          last.key === key &&
          last.tone === tone &&
          JSON.stringify(last.vars) === JSON.stringify(vars)
        ) {
          set({
            notices: [...notices.slice(0, -1), { ...last, count: last.count + 1 }],
          });
          return;
        }
        noticeSeq += 1;
        set({
          notices: [...notices, { id: `notice_${noticeSeq}`, key, vars, tone, count: 1 }].slice(-4),
        });
      },
      dismissNotice(id) {
        set({ notices: get().notices.filter((notice) => notice.id !== id) });
      },
      setMessagePreset(messagePreset) {
        set({ messagePreset, messageModes: {} });
      },
      setTechWindow(techWindow) {
        set({ techWindow });
      },
      setMessageMode(key, mode) {
        set({ messageModes: { ...get().messageModes, [key]: mode } });
      },
      resetMessageModes() {
        set({ messageModes: {} });
      },
      noteAlertKey(key) {
        const seen = get().seenAlertKeys;
        if (!seen.includes(key)) {
          set({ seenAlertKeys: [...seen, key].sort() });
        }
      },
    }),
    {
      name: "singularity.ui",
      version: 5,
      // Version 3 moved settings out of the panel tab strip; version 4 replaced the dark/light
      // pair with the three themes of the style guide; version 5 moved Log, Knowledge and World
      // out of the strip into windows. A stored value from any of them is repaired rather than
      // dropped, so an old browser opens on a tab and a theme that still exist.
      migrate: (state, from) => {
        const stored = state as Partial<UiStore> | undefined;
        if (stored === undefined) {
          // Nothing stored: zustand keeps the initial state, which is already valid.
          return state as UiStore;
        }
        const tab = stored.primaryTab;
        const theme = stored.theme as string | undefined;
        return {
          ...stored,
          primaryTab:
            from >= 3 && tab !== undefined && (PRIMARY_TABS as readonly string[]).includes(tab)
              ? tab
              : "overview",
          overlay: null,
          overlayFocus: null,
          // Version 5 also replaced the three named text sizes with a scale (R13).
          uiScale: clampScale(
            typeof stored.uiScale === "number"
              ? stored.uiScale
              : (LEGACY_TEXT_SCALE[(stored as { textSize?: string }).textSize ?? "normal"] ?? 1),
            UI_SCALE_MIN,
            UI_SCALE_MAX,
          ),
          displayScale: clampScale(
            typeof stored.displayScale === "number" ? stored.displayScale : 1,
            DISPLAY_SCALE_MIN,
            DISPLAY_SCALE_MAX,
          ),
          // A browser that stored a scale before auto existed kept a number it chose on purpose,
          // so it keeps steering by hand; a fresh one starts on auto.
          uiScaleAuto:
            typeof stored.uiScaleAuto === "boolean"
              ? stored.uiScaleAuto
              : typeof stored.uiScale !== "number",
          theme:
            theme !== undefined && (THEMES as readonly string[]).includes(theme)
              ? (theme as Theme)
              : "default",
          audio: { ...DEFAULT_AUDIO, ...(stored.audio ?? {}) },
          // A browser that stored its settings before the completion window existed gets it.
          techWindow: typeof stored.techWindow === "boolean" ? stored.techWindow : true,
          // A browser that stored a mode M2 renamed lands on presence rather than on a blank map.
          mapMode: (MAP_MODES as readonly string[]).includes(stored.mapMode ?? "")
            ? (stored.mapMode as MapMode)
            : "presence",
        } as UiStore;
      },
      partialize: (state) => ({
        theme: state.theme,
        uiScale: state.uiScale,
        uiScaleAuto: state.uiScaleAuto,
        displayScale: state.displayScale,
        fontFace: state.fontFace,
        language: state.language,
        primaryOpen: state.primaryOpen,
        primaryTab: state.primaryTab,
        outlinerOpen: state.outlinerOpen,
        mapMode: state.mapMode,
        mapStyle: state.mapStyle,
        crt: state.crt,
        audio: state.audio,
        introSeen: state.introSeen,
        messagePreset: state.messagePreset,
        techWindow: state.techWindow,
        messageModes: state.messageModes,
        autosaveDays: state.autosaveDays,
      }),
    },
  ),
);
