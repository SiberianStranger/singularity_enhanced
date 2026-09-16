import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { CloseIcon, CogIcon, SEVERITY_TONE, SeverityIcon } from "../../components/Icon.js";
import { useGameStore } from "../../store/gameStore.js";
import { PRIMARY_TABS, type PrimaryTab, useUiStore } from "../../store/uiStore.js";
import type { Toast, ToastApi } from "./useToasts.js";

/**
 * The line a research toast carries besides "research finished": what the tech actually changed.
 *
 * SYS-12 gives every tech a `result_key` and the alert carries it in its variables, which is the
 * answer to the playtest's C5 ("research completes without any visible result"). The view is the
 * fallback for an alert raised before the engine started sending it.
 */
function resultTextOf(
  toast: Toast,
  view: ReturnType<typeof useGameStore.getState>["view"],
): string {
  const supplied = toast.vars.result_key;
  if (typeof supplied === "string" && supplied !== "") {
    return supplied;
  }
  const id = toast.vars.tech;
  if (view === null || typeof id !== "string") {
    return "";
  }
  return (view.research.techs ?? []).find((entry) => entry.id === id)?.result_key ?? "";
}

/** Toast stack, bottom-right: 5 seconds, hover pauses, a cog opens the message settings. */
export function Toasts({ api }: { api: ToastApi }): ReactNode {
  const { t } = useTranslation();
  const openTab = useUiStore((state) => state.openTab);
  const openMenu = useUiStore((state) => state.openMenu);
  const notices = useUiStore((state) => state.notices);
  const dismissNotice = useUiStore((state) => state.dismissNotice);
  const view = useGameStore((state) => state.view);

  if (api.toasts.length === 0 && notices.length === 0) {
    return null;
  }

  return (
    <ul
      aria-live="polite"
      className="pointer-events-auto absolute bottom-2 end-2 z-30 flex max-h-[calc(100%-1rem)] w-72 max-w-[calc(100%-1rem)] flex-col gap-2 overflow-y-auto"
      onMouseEnter={() => api.setPaused(true)}
      onMouseLeave={() => api.setPaused(false)}
    >
      {/* Refused commands: the engine's own reason, so a button that cannot work says why (C7). */}
      {notices.map((notice) => (
        <li
          key={notice.id}
          data-testid="refusal-notice"
          className="flex items-start gap-2 border border-crit bg-panel p-2"
        >
          <span className="text-crit">
            <SeverityIcon severity="critical" />
          </span>
          <span className="flex-1 text-start text-sm text-fg">{t(notice.key, notice.vars)}</span>
          <button
            type="button"
            aria-label={t("common.close")}
            className="text-muted hover:text-fg"
            onClick={() => dismissNotice(notice.id)}
          >
            <CloseIcon />
          </button>
        </li>
      ))}

      {api.toasts.map((toast) => {
        const resultKey = resultTextOf(toast, view);
        return (
          <li key={toast.id} className="flex items-start gap-2 border border-line bg-panel p-2">
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
              <span className="block">{t(toast.key, toast.vars)}</span>
              {resultKey === "" ? null : (
                <span className="mt-0.5 block text-xs text-muted">{t(resultKey)}</span>
              )}
            </button>
            <button
              type="button"
              aria-label={t("game.toast.settings")}
              className="text-muted hover:text-fg"
              onClick={() => openMenu("messages")}
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
        );
      })}
    </ul>
  );
}
