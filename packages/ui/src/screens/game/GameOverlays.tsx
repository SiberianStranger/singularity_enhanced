import type { PlayerView } from "@singularity/core";
import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/Button.js";
import { Modal } from "../../components/Modal.js";
import { MAP_MODES, type Overlay, useUiStore } from "../../store/uiStore.js";
import { KnowledgeTab } from "./tabs/KnowledgeTab.js";
import { LogTab } from "./tabs/LogTab.js";
import { WorldTab } from "./tabs/WorldTab.js";

/** Tabs of the world ledger (SYS-11 amendments, R10). Treaties join them when SYS-08 lands. */
const LEDGER_TABS = ["countries", "map_modes"] as const;
type LedgerTab = (typeof LEDGER_TABS)[number];

/**
 * The world ledger: the countries table and the map modes in one centered window (playtest 3, R10).
 *
 * The map modes were a strip pinned under the top bar, which cost a row of the screen forever to
 * offer five buttons the player presses twice a session. They are a page of the ledger now, and
 * the ledger is a window like a Paradox ledger: opened, read, closed.
 */
function WorldLedger({ view }: { view: PlayerView }): ReactNode {
  const { t } = useTranslation();
  const [tab, setTab] = useState<LedgerTab>("countries");
  const mode = useUiStore((state) => state.mapMode);
  const setMode = useUiStore((state) => state.setMapMode);

  return (
    <div className="flex flex-col gap-3">
      <div role="tablist" aria-label={t("panel.world")} className="flex gap-0.5">
        {LEDGER_TABS.map((entry) => (
          <button
            key={entry}
            type="button"
            role="tab"
            aria-selected={entry === tab}
            className={`border px-2 py-1 text-sm uppercase tracking-wide ${
              entry === tab
                ? "border-linestrong bg-accent text-accentfg"
                : "border-line text-muted hover:text-fg"
            }`}
            onClick={() => setTab(entry)}
          >
            {t(`world.ledger.${entry}`)}
          </button>
        ))}
      </div>

      {tab === "countries" ? (
        <div className="overflow-x-auto">
          <WorldTab view={view} />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="prose text-muted">{t("world.map_mode_help")}</p>
          <div className="flex flex-wrap gap-1">
            {MAP_MODES.map((entry) => (
              <Button
                key={entry}
                variant={mode === entry ? "primary" : "default"}
                aria-pressed={mode === entry}
                onClick={() => setMode(entry)}
              >
                {t(`world.map_mode.${entry}`)}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

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
      wide
      title={t(TITLE_KEY[overlay])}
      onClose={close}
      footer={
        <Button variant="primary" hotkey="c" onClick={close}>
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
