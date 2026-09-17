import type { PlayerView } from "@singularity/core";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/Button.js";
import { Modal } from "../../components/Modal.js";
import { accelerator } from "../../lib/accelerators.js";
import { type Overlay, useUiStore } from "../../store/uiStore.js";
import { KnowledgeTab } from "./tabs/KnowledgeTab.js";
import { LogTab } from "./tabs/LogTab.js";
import { WorldLedger } from "./tabs/WorldTab.js";

const TITLE_KEY: Readonly<Record<Overlay, string>> = {
  log: "panel.log",
  knowledge: "panel.knowledge",
  world: "panel.world",
};

/**
 * The three windows that are drawn over the map instead of living in the primary panel's tab strip
 * (playtest 3, R8-R10): the full log, the knowledge base and the world ledger.
 *
 * They share `Modal`, so they trap focus, close on Escape and return focus where it was. Only one
 * is open at a time, which the store enforces by holding a single value rather than three flags.
 */
export function GameOverlays({ view }: { view: PlayerView }): ReactNode {
  const { t } = useTranslation();
  const overlay = useUiStore((state) => state.overlay);
  const close = useUiStore((state) => state.closeOverlay);

  if (overlay === null) {
    return null;
  }

  return (
    <Modal
      // The ledger is the widest window in the game: it prints ten columns of a hundred rows, and
      // a narrower frame would mean either a sideways scrollbar or headers cut to three letters.
      size={overlay === "world" ? "ledger" : "wide"}
      title={t(TITLE_KEY[overlay])}
      onClose={close}
      footer={
        <Button variant="primary" hotkey={accelerator(t, "common.close")} onClick={close}>
          {t("common.close")}
        </Button>
      }
    >
      {overlay === "log" ? <LogTab view={view} /> : null}
      {overlay === "knowledge" ? <KnowledgeTab /> : null}
      {overlay === "world" ? <WorldLedger view={view} /> : null}
    </Modal>
  );
}
