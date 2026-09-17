import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { accelerator } from "../../lib/accelerators.js";
import { matches } from "../../lib/hotkeys.js";
import { useGameStore } from "../../store/gameStore.js";
import { KEYED_TABS, OVERLAYS, panelLabelKey, useUiStore } from "../../store/uiStore.js";

/**
 * The speed space resumes at when nothing else is remembered. A game starts paused on its opening
 * events; at speed 2 the clock alone spends 18 to 36 minutes on a typical run, which is where the
 * balance runs put an attentive first game (SYS-11 "Pace (from the balance runs)").
 */
export const DEFAULT_SPEED = 2;

interface HotkeyActions {
  onQuicksave(): void;
  onQuickload(): void;
  onMenu(): void;
  /** True while a blocking event window is open; every hotkey is ignored then (SYS-11). */
  blocked: boolean;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  return (
    target.isContentEditable ||
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  );
}

/** Speed keys 0-5 and space, panel and window hotkeys, F5/F9 and Escape (SYS-11 "Keyboard"). */
export function useHotkeys({ onQuicksave, onQuickload, onMenu, blocked }: HotkeyActions): void {
  // The speed space goes back to: whatever the player last chose, or the default on a fresh game.
  const resumeAt = useRef(DEFAULT_SPEED);
  const { t } = useTranslation();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (isTypingTarget(event.target) || event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }
      if (blocked) {
        return;
      }
      const { setSpeed } = useGameStore.getState();
      const speed = useGameStore.getState().view?.speed ?? 0;

      if (event.key >= "0" && event.key <= "5") {
        event.preventDefault();
        const picked = Number(event.key);
        if (picked > 0) {
          resumeAt.current = picked;
        }
        setSpeed(picked);
        return;
      }
      if (event.key === " ") {
        event.preventDefault();
        if (speed === 0) {
          setSpeed(resumeAt.current);
        } else {
          resumeAt.current = speed;
          setSpeed(0);
        }
        return;
      }
      if (event.key === "F5") {
        event.preventDefault();
        onQuicksave();
        return;
      }
      if (event.key === "F9") {
        event.preventDefault();
        onQuickload();
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        // An open window takes Escape first; only when none is open does it reach the menu.
        if (useUiStore.getState().overlay !== null) {
          useUiStore.getState().closeOverlay();
          return;
        }
        onMenu();
        return;
      }
      /*
       * The panel tabs and the three windows over the map, by the letter each one shows underlined
       * in the language on screen (playtest 6, X13). The letters come from the locale rather than
       * from a table of Latin keys, and `matches` accepts the letter itself or the physical key it
       * sits on, so the same accelerator works on a Cyrillic and on a Latin keyboard.
       */
      for (const tab of KEYED_TABS) {
        const letter = accelerator(t, panelLabelKey(tab));
        if (letter !== undefined && matches(event, letter)) {
          event.preventDefault();
          useUiStore.getState().toggleTab(tab);
          return;
        }
      }
      for (const overlay of OVERLAYS) {
        const letter = accelerator(t, panelLabelKey(overlay));
        if (letter !== undefined && matches(event, letter)) {
          event.preventDefault();
          useUiStore.getState().toggleOverlay(overlay);
          return;
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onQuicksave, onQuickload, onMenu, blocked, t]);
}
