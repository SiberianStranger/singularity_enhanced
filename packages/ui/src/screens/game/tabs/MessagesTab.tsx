import type { Severity } from "@singularity/core";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../components/Button.js";
import { modeFor, presetModeFor } from "../../../store/selectors.js";
import {
  MESSAGE_MODES,
  type MessageMode,
  type MessagePreset,
  useUiStore,
} from "../../../store/uiStore.js";

const PRESETS: readonly MessagePreset[] = ["quiet", "default", "verbose"];

/**
 * Message settings (SYS-11): a coarse preset prefills every row, and any alert key the player has
 * seen can be overridden. Per player, persisted in UI settings, never in a save.
 */
export function MessagesTab(): ReactNode {
  const { t } = useTranslation();
  const preset = useUiStore((state) => state.messagePreset);
  const modes = useUiStore((state) => state.messageModes);
  const keys = useUiStore((state) => state.seenAlertKeys);
  const setPreset = useUiStore((state) => state.setMessagePreset);
  const setMode = useUiStore((state) => state.setMessageMode);
  const reset = useUiStore((state) => state.resetMessageModes);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs uppercase tracking-wide text-muted">{t("messages.preset")}</span>
        {PRESETS.map((entry) => (
          <Button
            key={entry}
            variant={preset === entry ? "primary" : "ghost"}
            onClick={() => setPreset(entry)}
          >
            {t(`messages.preset.${entry}`)}
          </Button>
        ))}
        <Button onClick={reset}>{t("messages.reset")}</Button>
      </div>

      <ul className="flex flex-col gap-1">
        {(["critical", "warning", "opportunity", "info"] as Severity[]).map((severity) => (
          <li key={severity} className="flex items-center justify-between gap-2 text-xs text-muted">
            <span>{t(`severity.${severity}`)}</span>
            <span className="font-mono">
              {t(`messages.mode.${presetModeFor(severity, preset)}`)}
            </span>
          </li>
        ))}
      </ul>

      {keys.length === 0 ? (
        <p className="text-sm text-muted">{t("messages.empty")}</p>
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
              <th scope="col" className="px-2 py-1 text-start font-medium">
                {t("messages.key")}
              </th>
              <th scope="col" className="px-2 py-1 text-start font-medium">
                {t("messages.mode.toast")}
              </th>
            </tr>
          </thead>
          <tbody>
            {keys.map((key) => (
              <tr key={key} className="border-b border-line/60">
                <td className="px-2 py-1 text-fg">{t(key, {})}</td>
                <td className="px-2 py-1">
                  <select
                    aria-label={key}
                    className="rounded border border-line bg-panel2 px-2 py-1 text-sm text-fg"
                    value={modeFor(key, "info", preset, modes)}
                    onChange={(event) => setMode(key, event.target.value as MessageMode)}
                  >
                    {MESSAGE_MODES.map((mode) => (
                      <option key={mode} value={mode}>
                        {t(`messages.mode.${mode}`)}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
