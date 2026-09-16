/**
 * UI-only state (SYS-11 "Layout"): which primary tab is pinned top-left, what the map selection is,
 * whether the outliner is open, theme, text size, language, message settings and the map mode.
 * Persisted to localStorage, never to a save.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

/** Counter behind notice ids: the client never needs randomness for a list key. */
let noticeSeq = 0;

/** Tabs of the pinned primary panel, in strip order. Later systems add their own. */
export const PRIMARY_TABS = [
  "overview",
  "compute",
  "research",
  "finances",
  "detection",
  "operations",
  "journal",
  "log",
  "knowledge",
  "world",
] as const;
export type PrimaryTab = (typeof PRIMARY_TABS)[number];

/**
 * Sections of the menu overlay (the Menu button and Escape). Settings and message settings live
 * here rather than as game panels: they are not part of playing, and a panel tab for them is a tab
 * the player scrolls past forever (playtest 1, U5).
 */
export const MENU_SECTIONS = ["root", "save", "load", "settings", "messages"] as const;
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
export type Theme = "dark" | "light";
/** "original" is the legacy game's angular face on labels and numbers; "plain" is the text face. */
export type FontFace = "original" | "plain";
export type TextSize = "small" | "normal" | "large";
export type MapMode = "presence" | "awareness" | "regulation" | "enforcement" | "opinion";
/** The textured map draws the geographic rasters under the vector layer; "vector" is the old look. */
export type MapStyle = "textured" | "vector";

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

export const TEXT_SCALE: Readonly<Record<TextSize, number>> = {
  small: 0.9,
  normal: 1,
  large: 1.15,
};

interface UiStore {
  theme: Theme;
  textSize: TextSize;
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
  /** Open section of the menu overlay; null when the overlay is closed. */
  menuSection: MenuSection | null;
  /** Client-raised messages (refused commands); never persisted. */
  notices: Notice[];
  messagePreset: MessagePreset;
  /** Per alert key override of the preset; only keys the player touched are stored. */
  messageModes: Record<string, MessageMode>;
  /** Alert keys seen this session, so the settings tab can list them. */
  seenAlertKeys: string[];
  autosaveDays: number;

  setTheme(theme: Theme): void;
  setTextSize(size: TextSize): void;
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
  openMenu(section?: MenuSection): void;
  closeMenu(): void;
  toggleMenu(): void;
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
      theme: "dark",
      textSize: "normal",
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
      menuSection: null,
      notices: [],
      messagePreset: "default",
      messageModes: {},
      seenAlertKeys: [],
      autosaveDays: 3,

      setTheme(theme) {
        set({ theme });
      },
      setTextSize(textSize) {
        set({ textSize });
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
      openMenu(section = "root") {
        set({ menuSection: section });
      },
      closeMenu() {
        set({ menuSection: null });
      },
      toggleMenu() {
        set({ menuSection: get().menuSection === null ? "root" : null });
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
      version: 3,
      // Settings and message settings stopped being panel tabs in version 3; a session that was
      // left on one of them opens on the overview instead of on a tab that no longer exists.
      migrate: (state, from) => {
        const stored = state as Partial<UiStore> | undefined;
        if (stored === undefined || from >= 3) {
          return stored as UiStore;
        }
        const tab = stored.primaryTab;
        return {
          ...stored,
          primaryTab:
            tab !== undefined && (PRIMARY_TABS as readonly string[]).includes(tab)
              ? tab
              : "overview",
        } as UiStore;
      },
      partialize: (state) => ({
        theme: state.theme,
        textSize: state.textSize,
        fontFace: state.fontFace,
        language: state.language,
        primaryOpen: state.primaryOpen,
        primaryTab: state.primaryTab,
        outlinerOpen: state.outlinerOpen,
        mapMode: state.mapMode,
        mapStyle: state.mapStyle,
        messagePreset: state.messagePreset,
        messageModes: state.messageModes,
        autosaveDays: state.autosaveDays,
      }),
    },
  ),
);
