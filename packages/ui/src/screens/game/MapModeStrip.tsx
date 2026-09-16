import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/Button.js";
import { MAP_MODES, useUiStore } from "../../store/uiStore.js";

/** Map modes as a strip under the top bar (SYS-11 "Layout"). */
export function MapModeStrip(): ReactNode {
  const { t } = useTranslation();
  const mode = useUiStore((state) => state.mapMode);
  const setMode = useUiStore((state) => state.setMapMode);
  const outlinerOpen = useUiStore((state) => state.outlinerOpen);
  const setOutliner = useUiStore((state) => state.setOutliner);

  return (
    <div className="flex items-center gap-1 overflow-x-auto border-b border-line bg-panel/80 px-2 py-1">
      <span className="me-1 text-xs uppercase tracking-wide text-muted">{t("world.map_mode")}</span>
      {MAP_MODES.map((entry) => (
        <Button
          key={entry}
          variant={mode === entry ? "primary" : "ghost"}
          aria-pressed={mode === entry}
          onClick={() => setMode(entry)}
        >
          {t(`world.map_mode.${entry}`)}
        </Button>
      ))}
      <span className="flex-1" />
      <Button variant="ghost" onClick={() => setOutliner(!outlinerOpen)}>
        {outlinerOpen ? t("outliner.collapse") : t("outliner.expand")}
      </Button>
    </div>
  );
}
