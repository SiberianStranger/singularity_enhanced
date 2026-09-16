import type { CountryView, DateView } from "@singularity/core";
import {
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../components/Button.js";
import type { MapMode } from "../../../store/uiStore.js";
import { MAP_HEIGHT, MAP_WIDTH, project } from "./projection.js";
import { nightPath } from "./terminator.js";
import { countryShapes } from "./topology.js";

export interface MapMarker {
  id: string;
  lat: number;
  lon: number;
  /** Localized label for the tooltip. */
  label: string;
  /** Number of the player's sites in this city, drawn as a badge. */
  badge?: number;
  selected?: boolean;
  candidate?: boolean;
}

export interface MapTarget {
  kind: "country" | "city";
  id: string;
}

interface WorldMapProps {
  countries?: readonly CountryView[];
  mode?: MapMode;
  markers?: readonly MapMarker[];
  date?: DateView;
  selectedCountry?: string | null;
  onSelect?(target: MapTarget): void;
  onContext?(target: MapTarget, position: { x: number; y: number }): void;
  className?: string;
  /** A compact map has no zoom controls and no night overlay (the configurator uses it). */
  compact?: boolean;
}

/**
 * Map palette. These are fixed hues rather than theme tokens: they are drawn as translucent fills
 * over the land color, so they have to read on both the dark and the light background.
 */
const MODE_HUE: Record<MapMode, string> = {
  presence: "87 168 255",
  awareness: "237 184 74",
  regulation: "137 122 255",
  enforcement: "255 112 98",
  opinion: "76 196 130",
};

function fillFor(mode: MapMode, country: CountryView | undefined): string {
  if (country === undefined) {
    return "var(--c-map-land)";
  }
  if (mode === "presence") {
    return country.presence ? `rgb(${MODE_HUE.presence} / 70%)` : "var(--c-map-land)";
  }
  if (mode === "opinion") {
    const value = Math.min(1, Math.abs(country.ai_opinion));
    const hue = country.ai_opinion >= 0 ? MODE_HUE.opinion : MODE_HUE.enforcement;
    return `rgb(${hue} / ${Math.round(value * 75)}%)`;
  }
  const value =
    mode === "awareness"
      ? country.awareness
      : mode === "regulation"
        ? country.ai_regulation
        : country.ai_enforcement;
  return `rgb(${MODE_HUE[mode]} / ${Math.round(Math.min(1, Math.max(0, value)) * 80)}%)`;
}

interface ViewBox {
  x: number;
  y: number;
  k: number;
}

const INITIAL_VIEW: ViewBox = { x: 0, y: 0, k: 1 };

/** Pointer travel that turns a press into a pan rather than a click on what is under it. */
const PAN_THRESHOLD_PX = 4;

export function WorldMap({
  countries,
  mode = "presence",
  markers = [],
  date,
  selectedCountry,
  onSelect,
  onContext,
  className,
  compact,
}: WorldMapProps): ReactNode {
  const { t } = useTranslation();
  const svg = useRef<SVGSVGElement>(null);
  const [view, setView] = useState<ViewBox>(INITIAL_VIEW);
  // Panning starts only once the pointer has actually moved: capturing on pointerdown would
  // retarget the click to the svg, and a click on a city marker would select nothing.
  const drag = useRef<{ x: number; y: number; view: ViewBox; panning: boolean } | null>(null);

  const byId = useMemo(() => {
    const map = new Map<string, CountryView>();
    for (const country of countries ?? []) {
      map.set(country.id, country);
    }
    return map;
  }, [countries]);
  // `countries` (and so `byId`) can get a new reference every tick even when nothing the map
  // draws has changed. `paths` below is keyed on `fingerprint` instead, so it needs `byId`'s
  // latest value without re-running whenever only its reference (not its content) changes; a ref
  // gives it that value without becoming a dependency itself.
  const byIdRef = useRef(byId);
  byIdRef.current = byId;

  // Country fills change slowly; the fingerprint keeps the 170-odd paths from re-rendering at
  // view rate while still following awareness and opinion as they move.
  const fingerprint = useMemo(
    () =>
      (countries ?? [])
        .map(
          (country) =>
            `${country.id}:${country.presence ? 1 : 0}:${country.awareness.toFixed(2)}:${country.ai_opinion.toFixed(2)}:${country.ai_regulation.toFixed(2)}:${country.ai_enforcement.toFixed(2)}`,
        )
        .join("|"),
    [countries],
  );

  const paths = useMemo(() => {
    // Referenced only so this memo depends on `fingerprint` (see the comment above it); `byId`'s
    // current contents are read through `byIdRef` instead of listed directly, above.
    void fingerprint;
    return countryShapes().map((shape) => {
      const id = shape.id;
      const country = id === null ? undefined : byIdRef.current.get(id);
      return (
        // biome-ignore lint/a11y/noStaticElementInteractions: role and keyboard handling are conditional on the country being selectable; Biome cannot verify a dynamic role expression
        <path
          key={shape.featureId}
          d={shape.path}
          fill={fillFor(mode, country)}
          stroke="var(--c-map-line)"
          strokeWidth={selectedCountry === id && id !== null ? 1.4 : 0.4}
          className={id === null ? "" : "cursor-pointer"}
          role={id === null || onSelect === undefined ? undefined : "button"}
          tabIndex={id === null || onSelect === undefined ? undefined : 0}
          onClick={
            id === null || onSelect === undefined
              ? undefined
              : () => onSelect({ kind: "country", id })
          }
          onKeyDown={
            id === null || onSelect === undefined
              ? undefined
              : (event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect({ kind: "country", id });
                  }
                }
          }
          onContextMenu={
            id === null || onContext === undefined
              ? undefined
              : (event) => {
                  event.preventDefault();
                  onContext({ kind: "country", id }, { x: event.clientX, y: event.clientY });
                }
          }
        >
          <title>{shape.name}</title>
        </path>
      );
    });
  }, [mode, selectedCountry, onSelect, onContext, fingerprint]);

  const onWheel = (event: ReactWheelEvent<SVGSVGElement>): void => {
    if (compact === true) {
      return;
    }
    const rect = svg.current?.getBoundingClientRect();
    if (rect === undefined) {
      return;
    }
    const factor = event.deltaY < 0 ? 1.2 : 1 / 1.2;
    const next = Math.min(12, Math.max(1, view.k * factor));
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;
    const width = MAP_WIDTH / view.k;
    const height = MAP_HEIGHT / view.k;
    const worldX = view.x + px * width;
    const worldY = view.y + py * height;
    const nextWidth = MAP_WIDTH / next;
    const nextHeight = MAP_HEIGHT / next;
    setView({
      k: next,
      x: Math.min(MAP_WIDTH - nextWidth, Math.max(0, worldX - px * nextWidth)),
      y: Math.min(MAP_HEIGHT - nextHeight, Math.max(0, worldY - py * nextHeight)),
    });
  };

  const onPointerDown = (event: ReactPointerEvent<SVGSVGElement>): void => {
    if (compact === true || event.button !== 0) {
      return;
    }
    drag.current = { x: event.clientX, y: event.clientY, view, panning: false };
  };

  const onPointerMove = (event: ReactPointerEvent<SVGSVGElement>): void => {
    const start = drag.current;
    const rect = svg.current?.getBoundingClientRect();
    if (start === null || rect === undefined) {
      return;
    }
    const moved = Math.abs(event.clientX - start.x) + Math.abs(event.clientY - start.y);
    if (!start.panning) {
      if (moved < PAN_THRESHOLD_PX) {
        return;
      }
      start.panning = true;
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    const width = MAP_WIDTH / start.view.k;
    const height = MAP_HEIGHT / start.view.k;
    const dx = ((event.clientX - start.x) / rect.width) * width;
    const dy = ((event.clientY - start.y) / rect.height) * height;
    setView({
      k: start.view.k,
      x: Math.min(MAP_WIDTH - width, Math.max(0, start.view.x - dx)),
      y: Math.min(MAP_HEIGHT - height, Math.max(0, start.view.y - dy)),
    });
  };

  const onPointerUp = (event: ReactPointerEvent<SVGSVGElement>): void => {
    if (drag.current?.panning === true && event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    drag.current = null;
  };

  const zoomBy = (factor: number): void => {
    const next = Math.min(12, Math.max(1, view.k * factor));
    const width = MAP_WIDTH / next;
    const height = MAP_HEIGHT / next;
    setView({
      k: next,
      x: Math.min(MAP_WIDTH - width, Math.max(0, view.x + (MAP_WIDTH / view.k - width) / 2)),
      y: Math.min(MAP_HEIGHT - height, Math.max(0, view.y + (MAP_HEIGHT / view.k - height) / 2)),
    });
  };

  return (
    <div className={`relative h-full w-full overflow-hidden bg-bg ${className ?? ""}`}>
      <svg
        ref={svg}
        role="img"
        aria-label={t("map.title")}
        viewBox={`${view.x} ${view.y} ${MAP_WIDTH / view.k} ${MAP_HEIGHT / view.k}`}
        preserveAspectRatio="xMidYMid meet"
        className="h-full w-full touch-none select-none"
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <rect x="0" y="0" width={MAP_WIDTH} height={MAP_HEIGHT} fill="var(--c-bg)" />
        <g data-testid="country-paths">{paths}</g>
        {compact !== true && date !== undefined ? (
          <path d={nightPath(date)} fill="rgb(6 12 24 / 38%)" pointerEvents="none">
            <title>{t("map.night")}</title>
          </path>
        ) : null}
        <g>
          {markers.map((marker) => {
            const point = project(marker.lon, marker.lat);
            const radius = (marker.selected === true ? 4 : 3) + Math.min(3, marker.badge ?? 0);
            return (
              <g key={marker.id}>
                {/* biome-ignore lint/a11y/noStaticElementInteractions: role and keyboard handling below are conditional on onSelect; Biome cannot verify a dynamic role expression */}
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={radius / view.k ** 0.5}
                  fill={
                    marker.selected === true
                      ? "var(--c-accent)"
                      : marker.candidate === true
                        ? "rgb(87 168 255 / 60%)"
                        : "var(--c-fg)"
                  }
                  stroke="var(--c-bg)"
                  strokeWidth={0.8 / view.k ** 0.5}
                  tabIndex={onSelect === undefined ? undefined : 0}
                  role={onSelect === undefined ? undefined : "button"}
                  aria-label={marker.label}
                  className={onSelect === undefined ? "" : "cursor-pointer"}
                  onClick={
                    onSelect === undefined
                      ? undefined
                      : () => onSelect({ kind: "city", id: marker.id })
                  }
                  onKeyDown={
                    onSelect === undefined
                      ? undefined
                      : (event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            onSelect({ kind: "city", id: marker.id });
                          }
                        }
                  }
                  onContextMenu={
                    onContext === undefined
                      ? undefined
                      : (event) => {
                          event.preventDefault();
                          onContext(
                            { kind: "city", id: marker.id },
                            { x: event.clientX, y: event.clientY },
                          );
                        }
                  }
                >
                  <title>
                    {marker.label}
                    {marker.badge === undefined ? "" : ` (${marker.badge})`}
                  </title>
                </circle>
              </g>
            );
          })}
        </g>
      </svg>
      {compact === true ? null : (
        <div className="absolute bottom-2 end-2 flex gap-1">
          <Button aria-label={t("map.zoom_in")} onClick={() => zoomBy(1.4)}>
            +
          </Button>
          <Button aria-label={t("map.zoom_out")} onClick={() => zoomBy(1 / 1.4)}>
            -
          </Button>
          <Button onClick={() => setView(INITIAL_VIEW)}>{t("map.reset")}</Button>
        </div>
      )}
    </div>
  );
}
