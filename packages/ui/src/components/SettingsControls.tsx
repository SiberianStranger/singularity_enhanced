import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { availableLanguages } from "../i18n/index.js";
import { type TextSize, type Theme, useUiStore } from "../store/uiStore.js";

const THEMES: readonly Theme[] = ["dark", "light"];
const SIZES: readonly TextSize[] = ["small", "normal", "large"];

/** Language, theme and text size; shared by the menu dialog and the in-game Settings tab. */
export function SettingsControls(): ReactNode {
  const { t } = useTranslation();
  const { theme, textSize, language, setTheme, setTextSize, setLanguage } = useUiStore();
  const languages = availableLanguages();

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-xs text-muted">
        {t("settings.language")}
        <select
          className="rounded border border-line bg-panel2 px-2 py-1 text-sm text-fg"
          value={language}
          onChange={(event) => setLanguage(event.target.value)}
        >
          {languages.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </select>
      </label>

      <fieldset className="flex flex-col gap-1">
        <legend className="text-xs text-muted">{t("settings.theme")}</legend>
        <div className="flex gap-2">
          {THEMES.map((option) => (
            <label key={option} className="flex items-center gap-1 text-sm text-fg">
              <input
                type="radio"
                name="theme"
                checked={theme === option}
                onChange={() => setTheme(option)}
              />
              {t(`settings.theme.${option}`)}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-1">
        <legend className="text-xs text-muted">{t("settings.text_size")}</legend>
        <div className="flex gap-2">
          {SIZES.map((option) => (
            <label key={option} className="flex items-center gap-1 text-sm text-fg">
              <input
                type="radio"
                name="text-size"
                checked={textSize === option}
                onChange={() => setTextSize(option)}
              />
              {t(`settings.text_size.${option}`)}
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
