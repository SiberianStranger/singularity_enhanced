/**
 * Prose the content bundle owns, with the client's own strings as the fallback (SYS-14).
 *
 * The bundle publishes the configurator's writing under `configurator.*`: the explanation window
 * each step opens with, and the sentences behind the terms of the "what this means in the game"
 * block. That writing is content, by the same argument as an event's text: it is the game talking,
 * it is translated through the locale files, and it changes when the design changes rather than
 * when the client does. While the bundle did not carry it the client shipped English of its own,
 * which is what `bundleKey` now retires one key at a time.
 *
 * `test/bundle-strings.test.ts` asserts the other direction: every `configurator.*` key the bundle
 * publishes is referenced from `src/`, so a string written for the game cannot sit unused.
 */

import { contentBundle } from "./bundle.js";

const AVAILABLE: ReadonlySet<string> = new Set(Object.keys(contentBundle.locales.en));

/** Whether the bundle carries this key at all, in the source language. */
export function hasBundleKey(key: string): boolean {
  return AVAILABLE.has(key);
}

/**
 * The content key when the bundle has written one, the client's own key when it has not.
 *
 * Both are passed the same variables by the caller, so a fallback string may ignore some of them;
 * an unused ICU argument is not an error, and a missing one would be.
 */
export function bundleKey(preferred: string, fallback: string): string {
  return AVAILABLE.has(preferred) ? preferred : fallback;
}
