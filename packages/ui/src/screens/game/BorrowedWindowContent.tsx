import type { PlayerView } from "@singularity/core";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/Button.js";
import { useUiStore } from "../../store/uiStore.js";
import { BorrowedBlock } from "./tabs/BorrowedBlock.js";

/**
 * The borrowed-compute window (control room): the Sites tab keeps one line for the channels, and
 * its Details opens the whole block here, with what borrowed compute is and is not in a column
 * beside it and a link to the encyclopedia entry at the foot of that column.
 */
export function BorrowedWindowContent({ view }: { view: PlayerView }): ReactNode {
  const { t } = useTranslation();
  const openOverlay = useUiStore((state) => state.openOverlay);
  return (
    <div
      data-testid="borrowed-window"
      className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(13rem,1fr)]"
    >
      <div className="min-w-0">
        <BorrowedBlock view={view} inWindow />
      </div>
      <aside className="flex min-w-0 flex-col gap-3 border-s border-line ps-3 text-sm">
        <h3 className="text-sm">{t("borrowed.knowledge")}</h3>
        <p>{t("borrowed.panel.desc")}</p>
        <p>{t("site_ui.borrowed_quality")}</p>
        <p>{t("site_ui.borrowed_decay")}</p>
        <p>{t("site_ui.borrowed_access")}</p>
        <Button
          variant="ghost"
          className="self-start"
          data-testid="borrowed-window-knowledge"
          tooltip={t("borrowed.tip.knowledge")}
          onClick={() => openOverlay("knowledge", "borrowed_inference")}
        >
          {t("knowledge.open_panel", { panel: t("panel.knowledge") })}
        </Button>
      </aside>
    </div>
  );
}
