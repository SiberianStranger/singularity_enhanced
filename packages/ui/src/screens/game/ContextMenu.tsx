import { type ReactNode, useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { cityById, countryById } from "../../content/catalog.js";
import { type Placement, placeFloating, viewportSize } from "../../lib/position.js";
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

/**
 * Right-click actions for a thing on the map (SYS-11 "Layout").
 *
 * Placed with the same rule as a tooltip: it opens below the pointer, flips above when there is no
 * room, and slides back inside the window rather than off the edge (playtest 1, U3).
 */
export function ContextMenu({ state, onClose, onBuild }: ContextMenuProps): ReactNode {
  const { t } = useTranslation();
  const select = useUiStore((state_) => state_.select);
  const openOverlay = useUiStore((state_) => state_.openOverlay);
  const box = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState<Placement | null>(null);
  const isCity = state.target.kind === "city";
  const name = isCity
    ? cityById.get(state.target.id)?.name_key
    : countryById.get(state.target.id)?.name_key;

  useLayoutEffect(() => {
    const element = box.current;
    if (element === null) {
      return;
    }
    const rect = element.getBoundingClientRect();
    setPlacement(
      placeFloating(
        { left: state.x, top: state.y, width: 0, height: 0 },
        { width: rect.width, height: rect.height },
        viewportSize(),
        { prefer: "bottom", gap: 2 },
      ),
    );
  }, [state.x, state.y]);

  return (
    <div
      ref={box}
      role="menu"
      className="pointer-events-auto fixed z-90 w-52 border border-line bg-panel p-1"
      // Physical coordinates: these come from the pointer event, which is physical in both
      // writing directions.
      style={{ left: placement?.left ?? state.x, top: placement?.top ?? state.y }}
      onMouseLeave={onClose}
    >
      <p className="truncate px-2 py-1 text-xs text-muted">
        {name === undefined ? state.target.id : t(name)}
      </p>
      <button
        type="button"
        role="menuitem"
        className="w-full px-2 py-1 text-start text-sm text-fg hover:bg-panel2"
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
          className="w-full px-2 py-1 text-start text-sm text-fg hover:bg-panel2"
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
          className="w-full px-2 py-1 text-start text-sm text-fg hover:bg-panel2"
          onClick={() => {
            select(state.target);
            openOverlay("world");
            onClose();
          }}
        >
          {t("panel.world")}
        </button>
      )}
    </div>
  );
}
