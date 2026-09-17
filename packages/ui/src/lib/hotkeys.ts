/**
 * Single-key accelerators, the original game's convention (ui-style-guide.md rule 4).
 *
 * A control declares one letter; the letter is underlined in its label and the key activates the
 * control whenever no text field has focus and no modifier is held. The letter is also written to
 * the DOM as `data-hotkey`, which is what the per-screen uniqueness test reads: two visible
 * controls sharing a letter is a bug the test fails on rather than something a player discovers.
 *
 * The letter belongs to the language, not to the keyboard (playtest 6, X13): the Russian rail
 * underlines a Cyrillic letter of the Russian word. A press matches either way round, so neither
 * language needs a particular layout:
 *
 * - `event.key` is the letter the layout produced, which is the underlined letter itself for a
 *   player typing in that language.
 * - `event.code` is the physical key, so a player on a Latin layout reaches the Cyrillic letter by
 *   pressing the key that letter sits on (the standard ЙЦУКЕН positions), and a player on a
 *   Cyrillic layout reaches a Latin letter the same way.
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

/**
 * Where each Cyrillic letter sits on the standard Russian layout, as `KeyboardEvent.code`.
 *
 * It is the second half of "the accelerator is a letter of the word": the letter tells the player
 * which key to press in their own alphabet, and this table tells the client which physical key
 * that is, so the same accelerator works for someone whose keyboard is typing Latin. The four
 * letters on punctuation keys (х, ъ, ж, э, б, ю, ё) are here for completeness; a screen that can
 * choose avoids them, because pressing `;` for "Журнал" is a worse fallback than pressing a letter.
 */
const CYRILLIC_KEY_CODES: Readonly<Record<string, string>> = {
  й: "KeyQ",
  ц: "KeyW",
  у: "KeyE",
  к: "KeyR",
  е: "KeyT",
  н: "KeyY",
  г: "KeyU",
  ш: "KeyI",
  щ: "KeyO",
  з: "KeyP",
  х: "BracketLeft",
  ъ: "BracketRight",
  ф: "KeyA",
  ы: "KeyS",
  в: "KeyD",
  а: "KeyF",
  п: "KeyG",
  р: "KeyH",
  о: "KeyJ",
  л: "KeyK",
  д: "KeyL",
  ж: "Semicolon",
  э: "Quote",
  я: "KeyZ",
  ч: "KeyX",
  с: "KeyC",
  м: "KeyV",
  и: "KeyB",
  т: "KeyN",
  ь: "KeyM",
  б: "Comma",
  ю: "Period",
  ё: "Backquote",
};

/** The physical key an accelerator letter sits on, or undefined for a letter on no known key. */
export function physicalKey(letter: string): string | undefined {
  const lower = letter.toLowerCase();
  if (lower.length !== 1) {
    return undefined;
  }
  if (lower >= "a" && lower <= "z") {
    return `Key${lower.toUpperCase()}`;
  }
  return CYRILLIC_KEY_CODES[lower];
}

/** Whether a keydown is this accelerator: the letter itself, or the key the letter lives on. */
export function matches(event: KeyboardEvent, letter: string, code?: string | undefined): boolean {
  if (event.key.toLowerCase() === letter.toLowerCase()) {
    return true;
  }
  const wantedCode = code ?? physicalKey(letter);
  // A press with a modifier is not this accelerator, and a key with no code (synthetic events in
  // tests, some soft keyboards) can only ever match by its letter.
  return wantedCode !== undefined && event.code === wantedCode;
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
    const code = physicalKey(letter);
    const onKeyDown = (event: KeyboardEvent): void => {
      if (!isPlainKey(event) || event.repeat || typingInTextField(event.target)) {
        return;
      }
      if (!matches(event, wanted, code)) {
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
 * letter is left whole and unmarked: the letter is a letter of the word in the language on screen
 * (`<key>.key` in the locale), so a label without it is a translation that has not been given one
 * yet, and the original's convention is an underline inside the word, never a letter bolted onto
 * the end of it (playtest 6, X13).
 */
export function splitLabel(label: string, letter: string): SplitLabel {
  const index = label.toLowerCase().indexOf(letter.toLowerCase());
  if (index < 0) {
    return { before: label, letter: "", after: "" };
  }
  return {
    before: label.slice(0, index),
    letter: label.slice(index, index + 1),
    after: label.slice(index + 1),
  };
}
