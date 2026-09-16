import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../components/Button.js";
import { SettingsControls } from "../../../components/SettingsControls.js";
import { useUiStore } from "../../../store/uiStore.js";

export function SettingsTab(): ReactNode {
  const { t } = useTranslation();
  const openTab = useUiStore((state) => state.openTab);
  const autosaveDays = useUiStore((state) => state.autosaveDays);

  return (
    <div className="flex flex-col gap-4">
      <SettingsControls />
      <p className="text-xs text-muted">{t("settings.autosave", { days: autosaveDays })}</p>
      <Button onClick={() => openTab("messages")}>{t("settings.messages_link")}</Button>
    </div>
  );
}
