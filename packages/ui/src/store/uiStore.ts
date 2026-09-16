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

/** Panel hotkeys (SYS-11). `A` opens Detection, which is where M1 keeps actors. */
export const PANEL_HOTKEYS: Readonly<Record<string, PrimaryTab>> = {
  c: "compute",
  r: "research",
  f: "finances",
  d: "detection",
  a: "detection",
  o: "operations",
  j: "journal",
};

/** The three windows and the keys that open them (playtest 3, R8-R10). */
export const OVERLAY_HOTKEYS: Readonly<Record<string, Overlay>> = {
  l: "log",
  k: "knowledge",
  w: "world",
};

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
export const UI_SCALE_MIN = 0.8;
export const UI_SCALE_MAX = 1.6;
export const UI_SCALE_STEP = 0.05;

/** A second, smaller dial for the angular face alone, for a player who finds it hard to read. */
export const DISPLAY_SCALE_MIN = 0.85;
export const DISPLAY_SCALE_MAX = 1.3;
export type MapMode = "presence" | "awareness" | "regulation" | "enforcement" | "opinion";
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
  "regulation",
  "enforcement",
  "opinion",
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
  /** Per alert key override of the preset; only keys the player touched are stored. */
  messageModes: Record<string, MessageMode>;
  /** Alert keys seen this session, so the settings tab can list them. */
  seenAlertKeys: string[];
  autosaveDays: number;

  setTheme(theme: Theme): void;
  setUiScale(scale: number): void;
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
  setMessageMode(key: string, mode: MessageMode): void;
  resetMessageModes(): void;
  noteAlertKey(key: string): void;
}

export const useUiStore = create<UiStore>()(
  persist(
    (set, get) => ({
      theme: "default",
      uiScale: 1,
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
      messageModes: {},
      seenAlertKeys: [],
      autosaveDays: 3,

      setTheme(theme) {
        set({ theme });
      },
      setUiScale(scale) {
        set({ uiScale: clampScale(scale, UI_SCALE_MIN, UI_SCALE_MAX) });
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
        noticeSeq += 1;
        set({ notices: [...notices, { id: `notice_${noticeSeq}`, key, vars, tone }].slice(-4) });
      },
      dismissNotice(id) {
        set({ notices: get().notices.filter((notice) => notice.id !== id) });
      },
      setMessagePreset(messagePreset) {
        set({ messagePreset, messageModes: {} });
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
          theme:
            theme !== undefined && (THEMES as readonly string[]).includes(theme)
              ? (theme as Theme)
              : "default",
          audio: { ...DEFAULT_AUDIO, ...(stored.audio ?? {}) },
        } as UiStore;
      },
      partialize: (state) => ({
        theme: state.theme,
        uiScale: state.uiScale,
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
        messageModes: state.messageModes,
        autosaveDays: state.autosaveDays,
      }),
    },
  ),
);
