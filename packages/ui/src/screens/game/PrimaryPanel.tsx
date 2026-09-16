import type { PlayerView } from "@singularity/core";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/Button.js";
import { CloseIcon } from "../../components/Icon.js";
import { PRIMARY_TABS, type PrimaryTab, useUiStore } from "../../store/uiStore.js";
import { ComputeTab } from "./tabs/ComputeTab.js";
import { DetectionTab } from "./tabs/DetectionTab.js";
import { FinancesTab } from "./tabs/FinancesTab.js";
import { JournalTab } from "./tabs/JournalTab.js";
import { KnowledgeTab } from "./tabs/KnowledgeTab.js";
import { LogTab } from "./tabs/LogTab.js";
import { OperationsTab } from "./tabs/OperationsTab.js";
import { OverviewTab } from "./tabs/OverviewTab.js";
import { ResearchTab } from "./tabs/ResearchTab.js";
import { WorldTab } from "./tabs/WorldTab.js";

function tabContent(tab: PrimaryTab, view: PlayerView): ReactNode {
  switch (tab) {
    case "compute":
      return <ComputeTab view={view} />;
    case "research":
      return <ResearchTab view={view} />;
    case "finances":
      return <FinancesTab view={view} />;
    case "detection":
      return <DetectionTab view={view} />;
    case "operations":
      return <OperationsTab view={view} />;
    case "journal":
      return <JournalTab view={view} />;
    case "log":
      return <LogTab view={view} />;
    case "knowledge":
      return <KnowledgeTab />;
    case "world":
      return <WorldTab view={view} />;
    default:
      return <OverviewTab view={view} />;
  }
}

/**
 * The pinned primary panel (SYS-11 "Layout"): one panel at a time, top-left, with a tab strip.
 * At phone width it covers the screen, which is the "full-screen tabs" rule.
 *
 * Settings and message settings are not tabs here; they are sections of the menu overlay
 * (playtest 1, U5). The panel is sized against its container, which starts below the map-mode
 * strip, so it can never cover it (U7).
 */
export function PrimaryPanel({ view }: { view: PlayerView }): ReactNode {
  const { t } = useTranslation();
  const open = useUiStore((state) => state.primaryOpen);
  const tab = useUiStore((state) => state.primaryTab);
  const openTab = useUiStore((state) => state.openTab);
  const close = useUiStore((state) => state.closePrimary);

  if (!open) {
    return (
      <div className="pointer-events-auto absolute start-2 top-2 z-20">
        <Button variant="primary" onClick={() => openTab(tab)}>
          {t("panel.open", { name: t(`panel.${tab}`) })}
        </Button>
      </div>
    );
  }

  return (
    <section
      aria-label={t(`panel.${tab}`)}
      className="pointer-events-auto absolute inset-0 z-20 flex flex-col border border-line bg-panel/97 shadow-xl sm:inset-auto sm:start-2 sm:top-2 sm:max-h-[calc(100%-1rem)] sm:w-[34rem] sm:max-w-[calc(100%-1rem)] sm:rounded"
    >
      <div className="flex items-center gap-1 border-b border-line px-1 py-1">
        <div
          role="tablist"
          aria-label={t("panel.open", { name: "" })}
          className="flex flex-1 flex-wrap gap-0.5"
        >
          {PRIMARY_TABS.map((entry) => (
            <button
              key={entry}
              type="button"
              role="tab"
              aria-selected={entry === tab}
              className={`rounded px-2 py-1 text-xs ${entry === tab ? "bg-accent text-accentfg" : "text-muted hover:bg-panel2 hover:text-fg"}`}
              onClick={() => openTab(entry)}
            >
              {t(`panel.${entry}`)}
            </button>
          ))}
        </div>
        <Button variant="ghost" aria-label={t("panel.close")} onClick={close}>
          <CloseIcon />
        </Button>
      </div>
      <div className="flex-1 overflow-auto p-3">{tabContent(tab, view)}</div>
    </section>
  );
}
