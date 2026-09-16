import type { PlayerView } from "@singularity/core";
import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/Button.js";
import { BellIcon, SEVERITY_TONE, SeverityIcon } from "../../components/Icon.js";
import { Tooltip } from "../../components/Tooltip.js";
import { groupAlerts, unreadCount } from "../../store/selectors.js";
import { PRIMARY_TABS, type PrimaryTab, useUiStore } from "../../store/uiStore.js";

function asTab(panel: string | undefined): PrimaryTab | null {
  return PRIMARY_TABS.includes(panel as PrimaryTab) ? (panel as PrimaryTab) : null;
}

/** Alert icons ordered by severity then recency, plus the bell with the full list (SYS-11). */
export function AlertIcons({ view }: { view: PlayerView }): ReactNode {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const openTab = useUiStore((state) => state.openTab);
  const groups = groupAlerts(view.notifications);
  const unread = unreadCount(view);

  const follow = (panel: string | undefined, id: string | undefined): void => {
    const tab = asTab(panel);
    if (tab !== null) {
      openTab(tab, id);
    }
  };

  return (
    <div className="relative flex items-center gap-1">
      <ul className="flex items-center gap-0.5" data-testid="alert-icons">
        {groups.slice(0, 8).map((group) => (
          <li key={group.key}>
            <Tooltip
              content={
                <span className="flex flex-col gap-1">
                  <span>{t(group.key, group.latest.vars)}</span>
                  {group.count > 1 ? (
                    <span className="text-muted">
                      {t("game.alerts.group", { count: group.count - 1 })}
                    </span>
                  ) : null}
                </span>
              }
            >
              <button
                type="button"
                data-severity={group.severity}
                aria-label={t(group.key, group.latest.vars)}
                className={`relative rounded p-1 hover:bg-panel2 ${SEVERITY_TONE[group.severity]}`}
                onClick={() => follow(group.latest.link?.panel, group.latest.link?.id)}
              >
                <SeverityIcon severity={group.severity} />
                {group.count > 1 ? (
                  <span className="absolute -top-0.5 end-0 font-mono text-[0.6rem] text-fg">
                    {group.count}
                  </span>
                ) : null}
              </button>
            </Tooltip>
          </li>
        ))}
      </ul>

      <Button
        variant="ghost"
        aria-label={t("game.bell_unread", { count: unread })}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <BellIcon />
        {unread > 0 ? <span className="font-mono text-xs">{unread}</span> : null}
      </Button>

      {open ? (
        <div className="absolute end-0 top-full z-50 mt-1 max-h-96 w-80 overflow-auto rounded border border-line bg-panel p-2 shadow-xl">
          {view.notifications.length === 0 ? (
            <p className="p-2 text-sm text-muted">{t("game.alerts.empty")}</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {[...view.notifications]
                .slice(-40)
                .reverse()
                .map((notification) => (
                  <li key={notification.id}>
                    <button
                      type="button"
                      className="flex w-full items-start gap-2 rounded px-2 py-1 text-start text-sm hover:bg-panel2"
                      onClick={() => {
                        follow(notification.link?.panel, notification.link?.id);
                        setOpen(false);
                      }}
                    >
                      <span className={SEVERITY_TONE[notification.severity]}>
                        <SeverityIcon severity={notification.severity} />
                      </span>
                      <span className={notification.read ? "text-muted" : "text-fg"}>
                        {t(notification.key, notification.vars)}
                      </span>
                    </button>
                  </li>
                ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
