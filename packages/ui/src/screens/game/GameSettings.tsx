import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/Button.js";
import { SettingsControls } from "../../components/SettingsControls.js";
import { buildRunLog, downloadRunLog } from "../../lib/runLog.js";
import { type MapStyle, useUiStore } from "../../store/uiStore.js";

const MAP_STYLES: readonly MapStyle[] = ["textured", "vector"];

/**
 * Settings as a section of the menu overlay (playtest 1, U5): the shared controls, plus the two
 * choices that are about this game's look rather than about the client as a whole, plus the run
 * log the player can hand over (playtest 8, Z9).
 */
export function GameSettings(): ReactNode {
  const { t } = useTranslation();
  const openMenu = useUiStore((state) => state.openMenu);
  const autosaveDays = useUiStore((state) => state.autosaveDays);
  const mapStyle = useUiStore((state) => state.mapStyle);
  const setMapStyle = useUiStore((state) => state.setMapStyle);
  const [saved, setSaved] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <SettingsControls />

      <fieldset className="flex flex-col gap-1" data-testid="map-style-settings">
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
        <p className="text-xs text-muted">{t("settings.map_style.help", { defaultValue: "" })}</p>
      </fieldset>

      <p className="text-xs text-muted">{t("settings.autosave", { days: autosaveDays })}</p>

      <div className="flex flex-col items-start gap-1">
        <Button onClick={() => openMenu("messages")}>{t("settings.messages_link")}</Button>
        <p className="text-xs text-muted">
          {t("settings.messages_link.help", { defaultValue: "" })}
        </p>
      </div>

      {/*
       * The run log (Z9). One file the maintainer can be sent: the build and the content bundle,
       * the setup, the journal and the log, every refused command, the last view, the settings and
       * the window it was played in. The copy button is the same JSON on the clipboard, for a shell
       * whose webview will not write a file.
       */}
      <div className="flex flex-col items-start gap-1" data-testid="run-log">
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => {
              setCopied(false);
              setSaved(downloadRunLog());
            }}
          >
            {t("settings.run_log")}
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              const text = JSON.stringify(buildRunLog(), null, 2);
              void navigator.clipboard?.writeText(text).then(() => {
                setSaved(null);
                setCopied(true);
              });
            }}
          >
            {t("settings.run_log.copy")}
          </Button>
        </div>
        <p className="text-xs text-muted">{t("settings.run_log.help")}</p>
        {saved === null ? null : (
          <p className="text-xs text-ok" data-testid="run-log-saved">
            {t("settings.run_log.saved", { name: saved })}
          </p>
        )}
        {copied ? (
          <p className="text-xs text-ok" data-testid="run-log-copied">
            {t("settings.run_log.copied")}
          </p>
        ) : null}
      </div>
    </div>
  );
}
