import { useEffect, useRef } from "react";
import { useGameStore } from "../../store/gameStore.js";
import { OVERLAY_HOTKEYS, PANEL_HOTKEYS, useUiStore } from "../../store/uiStore.js";

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
      const key = event.key.toLowerCase();
      const tab = PANEL_HOTKEYS[key];
      if (tab !== undefined) {
        event.preventDefault();
        useUiStore.getState().toggleTab(tab);
        return;
      }
      // L, K and W open the three windows over the map (playtest 3, R8-R10).
      const overlay = OVERLAY_HOTKEYS[key];
      if (overlay !== undefined) {
        event.preventDefault();
        useUiStore.getState().toggleOverlay(overlay);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onQuicksave, onQuickload, onMenu, blocked]);
}
