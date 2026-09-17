/**
 * Accelerator letters that belong to the language (playtest 6, X13).
 *
 * The original game underlined a letter of the word itself. The client could not, in Russian: the
 * accelerators were Latin letters in a table in the code, Russian labels are Cyrillic, and `Hotkey`
 * fell back to printing "(O)" after the word. So the letter moved into the locale, beside the
 * label it belongs to: the label at `<key>`, its accelerator at `<key>.key`. A translator picks a
 * letter of their own word, the underline lands inside the word in every language, and the client
 * holds no table of letters at all.
 *
 * The rules a set of letters has to keep, which `test/accelerators.test.tsx` checks:
 *
 * - the letter occurs in the label, so there is something to underline;
 * - no two controls that can be on screen together claim the same letter;
 * - one letter, not a word: a single character.
 */

import type { TFunction } from "i18next";

/** The suffix that turns a label key into its accelerator key. */
export const ACCELERATOR_SUFFIX = ".key";

/**
 * The accelerator a label carries in the current language, or undefined when it carries none.
 *
 * A language that has not given a control a letter simply gets no accelerator there rather than an
 * English letter it cannot see in its own word: half a convention is worse than none.
 */
export function accelerator(t: TFunction, labelKey: string): string | undefined {
  const value = t(`${labelKey}${ACCELERATOR_SUFFIX}`, { defaultValue: "" });
  const letter = typeof value === "string" ? value.trim() : "";
  return letter.length === 1 ? letter : undefined;
}
