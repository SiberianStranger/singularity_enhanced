/**
 * Localization (SYS-14): i18next with ICU MessageFormat, English as the source language.
 *
 * Two string sources are merged per language: this package's UI strings (`src/locales/en.json`)
 * and the content bundle's strings (`bundle.locales.<lang>`). Content wins on a key collision, so
 * a string the game itself writes replaces the client's own without the client knowing. Keys are
 * flat and contain dots, so key and namespace separators are switched off.
 */

import i18next, { type i18n as I18n } from "i18next";
import ICU from "i18next-icu";
import { initReactI18next } from "react-i18next";
import { contentBundle } from "../content/bundle.js";
import uiEn from "../locales/en.json";
import uiRu from "../locales/ru.json";

export const DEFAULT_LANGUAGE = "en";

/**
 * The client's own strings per language. The content bundle brings its own (SYS-14 rule 1), and a
 * language present here but absent from the bundle, or the other way round, still works: whatever
 * is missing falls back to English key by key.
 */
const UI_LOCALES: Record<string, Record<string, string>> = { en: uiEn, ru: uiRu };

/**
 * What each language calls itself, for the Settings selector. A player who cannot read the current
 * language has to be able to find their own in the list, so the list is never translated.
 */
const LANGUAGE_NAMES: Record<string, string> = { en: "English", ru: "Русский" };

/** The language's own name, or its code when nothing better is known. */
export function languageName(language: string): string {
  return LANGUAGE_NAMES[language] ?? language;
}

/** Languages written right to left; `dir` is set from this (SYS-14). */
const RTL_LANGUAGES = new Set(["ar", "he", "fa", "ur"]);

export function directionOf(language: string): "ltr" | "rtl" {
  return RTL_LANGUAGES.has(language.split("-")[0] ?? language) ? "rtl" : "ltr";
}

function resources(): Record<string, { translation: Record<string, string> }> {
  const bundled = contentBundle.locales;
  const languages = new Set<string>([
    DEFAULT_LANGUAGE,
    ...Object.keys(UI_LOCALES),
    ...Object.keys(bundled),
  ]);
  const out: Record<string, { translation: Record<string, string> }> = {};
  for (const language of languages) {
    out[language] = {
      translation: {
        ...(UI_LOCALES[language] ?? {}),
        ...(bundled[language] ?? {}),
      },
    };
  }
  return out;
}

export function availableLanguages(): string[] {
  return Object.keys(resources()).sort();
}

let started: Promise<I18n> | null = null;

/** Initializes i18next once; later calls return the same instance. */
export function initI18n(language = DEFAULT_LANGUAGE): Promise<I18n> {
  if (started === null) {
    started = i18next
      .use(ICU)
      .use(initReactI18next)
      .init({
        lng: language,
        fallbackLng: DEFAULT_LANGUAGE,
        resources: resources(),
        keySeparator: false,
        nsSeparator: false,
        interpolation: { escapeValue: false },
        returnNull: false,
      })
      .then(() => i18next);
  }
  return started;
}

export function setLanguage(language: string): void {
  void i18next.changeLanguage(language);
  if (typeof document !== "undefined") {
    document.documentElement.lang = language;
    document.documentElement.dir = directionOf(language);
  }
}

export { i18next };
