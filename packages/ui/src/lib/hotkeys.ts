/**
 * Single-key accelerators, the original game's convention (ui-style-guide.md rule 4).
 *
 * A control declares one letter; the letter is underlined in its label and the key activates the
 * control whenever no text field has focus and no modifier is held. The letter is also written to
 * the DOM as `data-hotkey`, which is what the per-screen uniqueness test reads: two visible
 * controls sharing a letter is a bug the test fails on rather than something a player discovers.
 */

import { useEffect } from "react";

/** The attribute every control with an accelerator carries. */
export const HOTKEY_ATTRIBUTE = "data-hotkey";

/** True while the keyboard belongs to a text field, where single-letter keys must type. */
export function typingInTextField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  if (target.isContentEditable) {
    return true;
  }
  const tag = target.tagName.toLowerCase();
  if (tag === "textarea" || tag === "select") {
    return true;
  }
  if (tag !== "input") {
    return false;
  }
  const type = (target as HTMLInputElement).type;
  // Checkboxes, radios, buttons and range sliders do not consume letters.
  return !["checkbox", "radio", "button", "submit", "reset", "range", "color"].includes(type);
}

/** Whether a keydown is a bare letter press, rather than a shortcut or a repeat of a chord. */
export function isPlainKey(event: KeyboardEvent): boolean {
  return !(event.ctrlKey || event.metaKey || event.altKey);
}

export interface HotkeyOptions {
  /** A registered but disabled hotkey does nothing; the underline stays, as on a disabled button. */
  enabled?: boolean;
}

/**
 * Registers one accelerator for as long as the component is mounted.
 *
 * Registration is per component rather than per screen so that a dialog's letters live and die with
 * the dialog. The listener runs in the capture phase of `keydown` on the window, so a key that
 * belongs to a control still reaches it when the focus sits on a panel with no handler of its own.
 */
export function useHotkey(
  letter: string | undefined,
  onPress: () => void,
  options: HotkeyOptions = {},
): void {
  const enabled = options.enabled ?? true;
  useEffect(() => {
    if (letter === undefined || letter === "" || !enabled) {
      return;
    }
    const wanted = letter.toLowerCase();
    const onKeyDown = (event: KeyboardEvent): void => {
      if (!isPlainKey(event) || event.repeat || typingInTextField(event.target)) {
        return;
      }
      if (event.key.toLowerCase() !== wanted) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      onPress();
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [letter, enabled, onPress]);
}

export interface SplitLabel {
  before: string;
  letter: string;
  after: string;
}

/**
 * Splits a label around the accelerator letter.
 *
 * The first case-insensitive occurrence is the one underlined. A label that does not contain the
 * letter at all (a translation where it does not appear) gets the letter appended in brackets, so
 * the accelerator is still visible and the underline is never faked on an unrelated character.
 */
export function splitLabel(label: string, letter: string): SplitLabel {
  const index = label.toLowerCase().indexOf(letter.toLowerCase());
  if (index < 0) {
    return { before: `${label} (`, letter: letter.toUpperCase(), after: ")" };
  }
  return {
    before: label.slice(0, index),
    letter: label.slice(index, index + 1),
    after: label.slice(index + 1),
  };
}
