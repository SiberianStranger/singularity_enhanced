/**
 * UI-only state (SYS-11 "Layout"): which primary tab is pinned top-left, what the map selection is,
 * whether the outliner is open, theme, text size, language, message settings and the map mode.
 * Persisted to localStorage, never to a save.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

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
  "messages",
  "settings",
] as const;
export type PrimaryTab = (typeof PRIMARY_TABS)[number];

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
export type TextSize = "small" | "normal" | "large";
export type MapMode = "presence" | "awareness" | "regulation" | "enforcement" | "opinion";

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
  language: string;
  /** The pinned primary panel: open or collapsed, and which tab it shows. */
  primaryOpen: boolean;
  primaryTab: PrimaryTab;
  /** Entity the open tab should scroll to, set by alert links and outliner jumps. */
  focusId: string | null;
  outlinerOpen: boolean;
  selection: Selection | null;
  mapMode: MapMode;
  messagePreset: MessagePreset;
  /** Per alert key override of the preset; only keys the player touched are stored. */
  messageModes: Record<string, MessageMode>;
  /** Alert keys seen this session, so the settings tab can list them. */
  seenAlertKeys: string[];
  autosaveDays: number;

  setTheme(theme: Theme): void;
  setTextSize(size: TextSize): void;
  setLanguage(language: string): void;
  openTab(tab: PrimaryTab, focusId?: string): void;
  toggleTab(tab: PrimaryTab): void;
  closePrimary(): void;
  select(selection: Selection | null): void;
  setOutliner(open: boolean): void;
  setMapMode(mode: MapMode): void;
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
      language: "en",
      primaryOpen: true,
      primaryTab: "overview",
      focusId: null,
      outlinerOpen: true,
      selection: null,
      mapMode: "presence",
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
        set({ selection });
      },
      setOutliner(outlinerOpen) {
        set({ outlinerOpen });
      },
      setMapMode(mapMode) {
        set({ mapMode });
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
      version: 2,
      partialize: (state) => ({
        theme: state.theme,
        textSize: state.textSize,
        language: state.language,
        primaryOpen: state.primaryOpen,
        primaryTab: state.primaryTab,
        outlinerOpen: state.outlinerOpen,
        mapMode: state.mapMode,
        messagePreset: state.messagePreset,
        messageModes: state.messageModes,
        autosaveDays: state.autosaveDays,
      }),
    },
  ),
);
