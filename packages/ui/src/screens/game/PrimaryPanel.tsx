import type { PlayerView } from "@singularity/core";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/Button.js";
import { Glyph, type GlyphName } from "../../components/glyphs.js";
import { Hotkey } from "../../components/Hotkey.js";
import { CloseIcon } from "../../components/Icon.js";
import { Tooltip } from "../../components/Tooltip.js";
import { accelerator } from "../../lib/accelerators.js";
import { HOTKEY_ATTRIBUTE } from "../../lib/hotkeys.js";
import { PRIMARY_TABS, type PrimaryTab, panelLabelKey, useUiStore } from "../../store/uiStore.js";
import { SelfPortrait } from "./SelfPortrait.js";
import { ActionsTab } from "./tabs/ActionsTab.js";
import { ComputeTab } from "./tabs/ComputeTab.js";
import { DetectionTab } from "./tabs/DetectionTab.js";
import { FinancesTab } from "./tabs/FinancesTab.js";
import { OverviewTab } from "./tabs/OverviewTab.js";
import { ResearchTab } from "./tabs/ResearchTab.js";

const TAB_GLYPHS: Record<string, GlyphName> = {
  compute: "fits_rack",
  research: "watcher_lab",
  finances: "cash",
  detection: "exposure",
  actions: "dial_tools",
};
function tabContent(tab: PrimaryTab, view: PlayerView): ReactNode {
  switch (tab) {
    case "research":
      return <ResearchTab view={view} />;
    case "finances":
      return <FinancesTab view={view} />;
    case "detection":
      return <DetectionTab view={view} />;
    case "actions":
      return <ActionsTab view={view} />;
    default:
      return <ComputeTab view={view} />;
  }
}

/**
 * The left column of the screen grid (SYS-11 "Layout", control room 0.3.0, playtest 10): the self's
 * portrait in the screen's top-left corner, which stays when the panel is closed and opens the self
 * sheet under itself, and under it the action panel with five tabs, one at a time.
 *
 * Overview is not a tab any more: it is the portrait's sheet. The journal is a window beside
 * Knowledge, and the decisions share Actions with the operations (playtest 10, V6). A tab shows a
 * glyph and a short label with its accelerator; the full name is the tab's accessible name and its
 * tooltip, and a panel narrower than the five labels with their spacing in Russian (a pinned
 * interface scale) keeps only the glyphs. Settings are sections of the menu overlay (playtest 1,
 * U5), and Log, Knowledge, World and Journal are windows over the map. The column is sized against
 * the screen container rather than the viewport, so it never reaches below the bottom bar (U8),
 * and it leaves 17rem beside it for the outliner and the gaps.
 */
export function PrimaryPanel({ view }: { view: PlayerView }): ReactNode {
  const { t } = useTranslation();
  const open = useUiStore((state) => state.primaryOpen);
  const storedTab = useUiStore((state) => state.primaryTab);
  const tab = storedTab === "overview" ? "compute" : storedTab;
  const openTab = useUiStore((state) => state.openTab);
  const close = useUiStore((state) => state.closePrimary);
  const selfOpen = useUiStore((state) => state.selfOpen);
  const setSelfOpen = useUiStore((state) => state.setSelfOpen);
  return (
    <div
      data-testid="primary-shell"
      // The left column of the screen grid, from the top edge down to the bottom bar: the portrait
      // in the corner, flush with the edges as the top bar is, and the action panel under it with
      // the grid's half-rem inset. It spans the bar's row, so the panel follows the portrait
      // however its rows wrap (playtest 10, V7).
      // Below 79rem of screen (a pinned scale in a small window) the bar cannot spare the corner:
      // the column starts under the bar again, with the portrait at its head as in 0.3.0.
      className="pointer-events-none relative z-30 col-start-1 row-start-1 row-end-3 flex max-h-full min-h-0 flex-col gap-2 self-start @max-[79rem]/screen:row-start-2 @max-[79rem]/screen:mt-2 @max-[48rem]/screen:col-span-3 @max-[48rem]/screen:max-w-full"
    >
      <div className="pointer-events-none relative z-40 min-w-0">
        <div className="pointer-events-auto w-[var(--corner-w)] max-w-full @max-[79rem]/screen:ms-2">
          <SelfPortrait view={view} expanded={selfOpen} onToggle={() => setSelfOpen(!selfOpen)} />
        </div>
        {selfOpen ? (
          <section
            data-testid="self-overview"
            aria-label={t("panel.overview")}
            // Under the portrait, where the maintainer expects it, over the action panel and as
            // wide as it (playtest 10, V4).
            className="pointer-events-auto absolute start-2 top-full z-50 mt-1 flex max-h-[calc(100dvh-8rem)] w-[var(--panel-w)] max-w-[calc(100cqw-17rem)] min-w-0 flex-col border border-linestrong bg-panel @max-[48rem]/screen:max-w-[calc(100cqw-1rem)]"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-line bg-accent px-3 py-1">
              <h2 className="text-sm uppercase">{t("panel.overview")}</h2>
              <Button
                variant="ghost"
                aria-label={t("self_ui.close")}
                onClick={() => setSelfOpen(false)}
              >
                <CloseIcon />
              </Button>
            </div>
            <div className="min-h-0 overflow-x-hidden overflow-y-auto p-3">
              <OverviewTab view={view} />
            </div>
          </section>
        ) : null}
      </div>
      {open ? (
        <section
          aria-label={t(panelLabelKey(tab))}
          data-testid="primary-panel"
          // As wide as the tab row needs in Russian and never wider than the screen less the
          // outliner and the gaps (17rem); the width is `--panel-w`, shared with the self sheet.
          className="@container/primary pointer-events-auto ms-2 flex min-h-0 w-[var(--panel-w)] max-w-[calc(100cqw-17rem)] flex-1 flex-col border border-line bg-panel/97 @max-[48rem]/screen:max-w-[calc(100cqw-1rem)]"
        >
          <div className="flex shrink-0 items-center gap-1 border-b border-line p-1">
            <div
              role="tablist"
              aria-label={t("panel.open", { name: "" })}
              // Five tabs with room between them in Russian (playtest 10, V5): a gap of their own
              // and more padding inside each, instead of six boxes pressed edge to edge.
              className="flex min-w-0 flex-1 flex-nowrap gap-1.5"
            >
              {PRIMARY_TABS.map((entry) => {
                const letter = accelerator(t, panelLabelKey(entry));
                return (
                  <Tooltip
                    key={entry}
                    content={t(panelLabelKey(entry))}
                    // Sized by their labels and then stretched to the strip, not five equal
                    // cells: "Обнаружение" needs twice the width of "Наука", and equal cells cut
                    // the long one while the short one had room to spare.
                    className="min-w-0 flex-auto"
                  >
                    <button
                      type="button"
                      role="tab"
                      aria-label={t(panelLabelKey(entry))}
                      aria-selected={entry === tab}
                      {...(letter === undefined
                        ? {}
                        : { [HOTKEY_ATTRIBUTE]: letter.toLowerCase() })}
                      className={`flex w-full min-w-0 items-center justify-center gap-1 whitespace-nowrap border px-2 py-1 text-xs uppercase ${entry === tab ? "border-linestrong bg-accent text-accentfg" : "border-line text-muted hover:bg-panel2 hover:text-fg"}`}
                      onClick={() => openTab(entry)}
                    >
                      <Glyph name={TAB_GLYPHS[entry] ?? "generic"} size={14} className="shrink-0" />
                      {/* A panel narrower than its five labels (a pinned interface scale) keeps
                          the glyphs; the name is the tab's accessible name and its tooltip. */}
                      <span className="@max-[46rem]/primary:hidden">
                        <Hotkey label={t(`panel.short.${entry}`)} letter={letter} />
                      </span>
                    </button>
                  </Tooltip>
                );
              })}
            </div>
            <Button
              variant="ghost"
              className="shrink-0 p-1"
              aria-label={t("panel.close")}
              onClick={close}
            >
              <CloseIcon />
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-2">
            {tabContent(tab, view)}
          </div>
        </section>
      ) : (
        // As wide as its button: a block here took the whole column and ate the clicks and the
        // wheel of the strip of map beside the button.
        <div className="pointer-events-auto ms-2 w-fit">
          <Button variant="primary" onClick={() => openTab(tab)}>
            {t("panel.open", { name: t(panelLabelKey(tab)) })}
          </Button>
        </div>
      )}
    </div>
  );
}
