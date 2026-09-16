import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { CloseIcon, CogIcon, SEVERITY_TONE, SeverityIcon } from "../../components/Icon.js";
import { PRIMARY_TABS, type PrimaryTab, useUiStore } from "../../store/uiStore.js";
import type { ToastApi } from "./useToasts.js";

/** Toast stack, bottom-right: 5 seconds, hover pauses, a cog opens the message settings. */
export function Toasts({ api }: { api: ToastApi }): ReactNode {
  const { t } = useTranslation();
  const openTab = useUiStore((state) => state.openTab);

  if (api.toasts.length === 0) {
    return null;
  }

  return (
    <ul
      aria-live="polite"
      className="pointer-events-auto absolute bottom-2 end-2 z-30 flex w-72 flex-col gap-2"
      onMouseEnter={() => api.setPaused(true)}
      onMouseLeave={() => api.setPaused(false)}
    >
      {api.toasts.map((toast) => (
        <li
          key={toast.id}
          className="flex items-start gap-2 rounded border border-line bg-panel p-2 shadow-lg"
        >
          <span className={SEVERITY_TONE[toast.severity]}>
            <SeverityIcon severity={toast.severity} />
          </span>
          <button
            type="button"
            className="flex-1 text-start text-sm text-fg"
            onClick={() => {
              const panel = toast.link?.panel;
              if (panel !== undefined && PRIMARY_TABS.includes(panel as PrimaryTab)) {
                openTab(panel as PrimaryTab, toast.link?.id);
              }
              api.dismiss(toast.id);
            }}
          >
            {t(toast.key, toast.vars)}
          </button>
          <button
            type="button"
            aria-label={t("game.toast.settings")}
            className="text-muted hover:text-fg"
            onClick={() => openTab("messages")}
          >
            <CogIcon />
          </button>
          <button
            type="button"
            aria-label={t("common.close")}
            className="text-muted hover:text-fg"
            onClick={() => api.dismiss(toast.id)}
          >
            <CloseIcon />
          </button>
        </li>
      ))}
    </ul>
  );
}
