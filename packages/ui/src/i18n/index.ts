/**
 * Localization (SYS-14): i18next with ICU MessageFormat, English as the source language.
 *
 * Two string sources are merged per language: this package's UI strings (`src/locales/en.json`)
 * and the content bundle's strings (`bundle.locales.<lang>`). Content wins on a key collision, so
 * the placeholder strings that accompany the development content fallback disappear by themselves
 * once the bundle carries the real records. Keys are flat and contain dots, so key and namespace
 * separators are switched off.
 */

import i18next, { type i18n as I18n } from "i18next";
import ICU from "i18next-icu";
import { initReactI18next } from "react-i18next";
import { contentBundle } from "../content/bundle.js";
import { catalog } from "../content/catalog.js";
import uiEn from "../locales/en.json";
import fallbackContentEn from "../locales/en-fallback.json";

export const DEFAULT_LANGUAGE = "en";

/** Languages written right to left; `dir` is set from this (SYS-14). */
const RTL_LANGUAGES = new Set(["ar", "he", "fa", "ur"]);

export function directionOf(language: string): "ltr" | "rtl" {
  return RTL_LANGUAGES.has(language.split("-")[0] ?? language) ? "rtl" : "ltr";
}

function resources(): Record<string, { translation: Record<string, string> }> {
  const usesFallbackContent = catalog.usedFallback.length > 0;
  const bundled = contentBundle.locales;
  const languages = new Set<string>([DEFAULT_LANGUAGE, ...Object.keys(bundled)]);
  const out: Record<string, { translation: Record<string, string> }> = {};
  for (const language of languages) {
    out[language] = {
      translation: {
        ...(language === DEFAULT_LANGUAGE ? uiEn : {}),
        ...(language === DEFAULT_LANGUAGE && usesFallbackContent ? fallbackContentEn : {}),
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
