import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/Button.js";
import { SettingsControls } from "../../components/SettingsControls.js";
import { type FontFace, type MapStyle, useUiStore } from "../../store/uiStore.js";

const MAP_STYLES: readonly MapStyle[] = ["textured", "vector"];
const FONTS: readonly FontFace[] = ["original", "plain"];

/**
 * Settings as a section of the menu overlay (playtest 1, U5): the shared controls, plus the two
 * choices that are about this game's look rather than about the client as a whole.
 */
export function GameSettings(): ReactNode {
  const { t } = useTranslation();
  const openMenu = useUiStore((state) => state.openMenu);
  const autosaveDays = useUiStore((state) => state.autosaveDays);
  const mapStyle = useUiStore((state) => state.mapStyle);
  const setMapStyle = useUiStore((state) => state.setMapStyle);
  const fontFace = useUiStore((state) => state.fontFace);
  const setFontFace = useUiStore((state) => state.setFontFace);

  return (
    <div className="flex flex-col gap-4">
      <SettingsControls />

      <fieldset className="flex flex-col gap-1">
        <legend className="text-xs text-muted">{t("settings.map_style")}</legend>
        <div className="flex gap-2">
          {MAP_STYLES.map((option) => (
            <label key={option} className="flex items-center gap-1 text-sm text-fg">
              <input
                type="radio"
                name="map-style"
                checked={mapStyle === option}
                onChange={() => setMapStyle(option)}
              />
              {t(`settings.map_style.${option}`)}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-1">
        <legend className="text-xs text-muted">{t("settings.font")}</legend>
        <div className="flex gap-2">
          {FONTS.map((option) => (
            <label key={option} className="flex items-center gap-1 text-sm text-fg">
              <input
                type="radio"
                name="font-face"
                checked={fontFace === option}
                onChange={() => setFontFace(option)}
              />
              {t(`settings.font.${option}`)}
            </label>
          ))}
        </div>
      </fieldset>

      <p className="text-xs text-muted">{t("settings.autosave", { days: autosaveDays })}</p>
      <Button onClick={() => openMenu("messages")}>{t("settings.messages_link")}</Button>
    </div>
  );
}
