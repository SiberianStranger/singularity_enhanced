import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { cityById, countryById } from "../../content/catalog.js";
import { useUiStore } from "../../store/uiStore.js";
import type { MapTarget } from "./map/WorldMap.js";

export interface ContextMenuState {
  target: MapTarget;
  x: number;
  y: number;
}

interface ContextMenuProps {
  state: ContextMenuState;
  onClose(): void;
  onBuild(cityId: string): void;
}

/** Right-click actions for a thing on the map (SYS-11 "Layout"). */
export function ContextMenu({ state, onClose, onBuild }: ContextMenuProps): ReactNode {
  const { t } = useTranslation();
  const select = useUiStore((state_) => state_.select);
  const openTab = useUiStore((state_) => state_.openTab);
  const isCity = state.target.kind === "city";
  const name = isCity
    ? cityById.get(state.target.id)?.name_key
    : countryById.get(state.target.id)?.name_key;

  return (
    <div
      role="menu"
      className="pointer-events-auto fixed z-90 w-52 rounded border border-line bg-panel p-1 shadow-xl"
      style={{ insetInlineStart: state.x, insetBlockStart: state.y }}
      onMouseLeave={onClose}
    >
      <p className="truncate px-2 py-1 text-xs text-muted">
        {name === undefined ? state.target.id : t(name)}
      </p>
      <button
        type="button"
        role="menuitem"
        className="w-full rounded px-2 py-1 text-start text-sm text-fg hover:bg-panel2"
        onClick={() => {
          select(state.target);
          onClose();
        }}
      >
        {t("selection.title")}
      </button>
      {isCity ? (
        <button
          type="button"
          role="menuitem"
          className="w-full rounded px-2 py-1 text-start text-sm text-fg hover:bg-panel2"
          onClick={() => {
            onBuild(state.target.id);
            onClose();
          }}
        >
          {t("selection.build_here")}
        </button>
      ) : (
        <button
          type="button"
          role="menuitem"
          className="w-full rounded px-2 py-1 text-start text-sm text-fg hover:bg-panel2"
          onClick={() => {
            select(state.target);
            openTab("world", state.target.id);
            onClose();
          }}
        >
          {t("panel.world")}
        </button>
      )}
    </div>
  );
}
