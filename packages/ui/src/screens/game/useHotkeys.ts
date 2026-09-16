import { useEffect } from "react";
import { useGameStore } from "../../store/gameStore.js";
import { PANEL_HOTKEYS, useUiStore } from "../../store/uiStore.js";

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

/** Speed keys 0-5 and space, panel hotkeys, F5/F9 and Escape (SYS-11 "Keyboard"). */
export function useHotkeys({ onQuicksave, onQuickload, onMenu, blocked }: HotkeyActions): void {
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
        setSpeed(Number(event.key));
        return;
      }
      if (event.key === " ") {
        event.preventDefault();
        setSpeed(speed === 0 ? 1 : 0);
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
        onMenu();
        return;
      }
      const tab = PANEL_HOTKEYS[event.key.toLowerCase()];
      if (tab !== undefined) {
        event.preventDefault();
        useUiStore.getState().toggleTab(tab);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onQuicksave, onQuickload, onMenu, blocked]);
}
