import type { PlayerView } from "@singularity/core";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/Button.js";
import { Hotkey } from "../../components/Hotkey.js";
import { CloseIcon } from "../../components/Icon.js";
import { HOTKEY_ATTRIBUTE } from "../../lib/hotkeys.js";
import { PRIMARY_TABS, type PrimaryTab, useUiStore } from "../../store/uiStore.js";
import { ComputeTab } from "./tabs/ComputeTab.js";
import { DetectionTab } from "./tabs/DetectionTab.js";
import { FinancesTab } from "./tabs/FinancesTab.js";
import { JournalTab } from "./tabs/JournalTab.js";
import { OperationsTab } from "./tabs/OperationsTab.js";
import { OverviewTab } from "./tabs/OverviewTab.js";
import { ResearchTab } from "./tabs/ResearchTab.js";

/**
 * The accelerator each tab shows underlined (style guide rule 4). They are the same letters
 * `PANEL_HOTKEYS` registers globally, so the strip advertises the keys that already work; the key
 * itself stays registered once, in `useHotkeys`, rather than a second time per visible tab.
 */
const TAB_HOTKEY: Readonly<Record<PrimaryTab, string | undefined>> = {
  overview: "v",
  compute: "c",
  research: "r",
  finances: "f",
  detection: "d",
  operations: "o",
  journal: "j",
};

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
    default:
      return <OverviewTab view={view} />;
  }
}

/**
 * The pinned primary panel (SYS-11 "Layout"): one panel at a time, top-left, with a tab strip.
 * At phone width it covers the screen, which is the "full-screen tabs" rule.
 *
 * Settings and message settings are not tabs here; they are sections of the menu overlay
 * (playtest 1, U5), and Log, Knowledge and World are windows over the map (playtest 3, R8-R10).
 * The panel is sized against its container rather than the viewport, so it can never reach above
 * the top bar or below the bottom edge (U8).
 */
export function PrimaryPanel({ view }: { view: PlayerView }): ReactNode {
  const { t } = useTranslation();
  const open = useUiStore((state) => state.primaryOpen);
  const tab = useUiStore((state) => state.primaryTab);
  const openTab = useUiStore((state) => state.openTab);
  const close = useUiStore((state) => state.closePrimary);

  if (!open) {
    return (
      <div className="pointer-events-auto col-start-1 row-start-1 self-start">
        <Button variant="primary" onClick={() => openTab(tab)}>
          {t("panel.open", { name: t(`panel.${tab}`) })}
        </Button>
      </div>
    );
  }

  return (
    <section
      aria-label={t(`panel.${tab}`)}
      // The panel is the top of the left column of the screen grid: it never floats over another
      // region, and its height is what the row leaves it (L8). Below 40rem of map region it takes
      // the whole grid, which is the last step of the reflow order (L11).
      className="pointer-events-auto col-start-1 row-start-1 flex max-h-full min-h-0 w-[32rem] max-w-full flex-col self-start border border-line bg-panel/97 @max-[40rem]/screen:col-span-3 @max-[40rem]/screen:w-full"
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
              {...(TAB_HOTKEY[entry] === undefined
                ? {}
                : { [HOTKEY_ATTRIBUTE]: TAB_HOTKEY[entry] })}
              className={`border px-2 py-1 text-xs uppercase tracking-wide ${
                entry === tab
                  ? "border-linestrong bg-accent text-accentfg"
                  : "border-line text-muted hover:bg-panel2 hover:text-fg"
              }`}
              onClick={() => openTab(entry)}
            >
              <Hotkey label={t(`panel.${entry}`)} letter={TAB_HOTKEY[entry]} />
            </button>
          ))}
        </div>
        <Button variant="ghost" aria-label={t("panel.close")} onClick={close}>
          <CloseIcon />
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-2">{tabContent(tab, view)}</div>
    </section>
  );
}
