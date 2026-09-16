import type { CountryView, DateView } from "@singularity/core";
import {
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import dayTexture from "../../../assets/earth.jpg";
import nightTexture from "../../../assets/earth_night.jpg";
import { Button } from "../../../components/Button.js";
import type { MapMode, MapStyle } from "../../../store/uiStore.js";
import { MAP_HEIGHT, MAP_WIDTH, project } from "./projection.js";
import { nightPath } from "./terminator.js";
import { countryShapes } from "./topology.js";

/*
 * The two rasters under the vector layer are the original game's Earth textures
 * (`singularity/data/themes/default/images/earth.jpg` and `earth_night.jpg`), which are NASA Blue
 * Marble derivatives. NASA's terms are quoted in LICENSE.txt: the imagery is credited to NASA, and
 * the About screen carries that credit. Both are plate carree, the same projection
 * `projection.ts` uses, so the raster and the vector layer share one coordinate system and stay
 * aligned at every zoom without a second transform.
 */

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
  /** "textured" draws the geographic rasters under the vector layer; "vector" is the flat look. */
  style?: MapStyle;
  markers?: readonly MapMarker[];
  date?: DateView;
  /**
   * Fraction of the current game hour already gone by in real time, so the terminator slides
   * between ticks instead of jumping (SYS-11 "Smooth clock"); 0 snaps it to the tick.
   */
  subHour?: number;
  selectedCountry?: string | null;
  onSelect?(target: MapTarget): void;
  onContext?(target: MapTarget, position: { x: number; y: number }): void;
  className?: string;
  /** A compact map has no zoom controls and no night overlay (the configurator uses it). */
  compact?: boolean;
}

/**
 * Map palette. These are fixed hues rather than theme tokens: they are drawn as translucent fills
 * over the land color or the day texture, so they have to read on both.
 */
const MODE_HUE: Record<MapMode, string> = {
  presence: "87 168 255",
  awareness: "237 184 74",
  regulation: "137 122 255",
  enforcement: "255 112 98",
  opinion: "76 196 130",
};

function modeValue(mode: MapMode, country: CountryView): number {
  switch (mode) {
    case "presence":
      return country.presence ? 1 : 0;
    case "awareness":
      return country.awareness;
    case "regulation":
      return country.ai_regulation;
    case "enforcement":
      return country.ai_enforcement;
    default:
      return country.ai_opinion;
  }
}

function fillFor(mode: MapMode, country: CountryView | undefined, textured: boolean): string {
  const base = textured ? "transparent" : "var(--c-map-land)";
  if (country === undefined) {
    return base;
  }
  if (mode === "presence") {
    return country.presence ? `rgb(${MODE_HUE.presence} / 70%)` : base;
  }
  if (mode === "opinion") {
    const value = Math.min(1, Math.abs(country.ai_opinion));
    const hue = country.ai_opinion >= 0 ? MODE_HUE.opinion : MODE_HUE.enforcement;
    return value <= 0.01 ? base : `rgb(${hue} / ${Math.round(value * 75)}%)`;
  }
  const value = Math.min(1, Math.max(0, modeValue(mode, country)));
  return value <= 0.01 ? base : `rgb(${MODE_HUE[mode]} / ${Math.round(value * 80)}%)`;
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
  style = "textured",
  markers = [],
  date,
  subHour = 0,
  selectedCountry,
  onSelect,
  onContext,
  className,
  compact,
}: WorldMapProps): ReactNode {
  const { t } = useTranslation();
  const svg = useRef<SVGSVGElement>(null);
  const ids = useId();
  const [view, setView] = useState<ViewBox>(INITIAL_VIEW);
  // Panning starts only once the pointer has actually moved: capturing on pointerdown would
  // retarget the click to the svg, and a click on a city marker would select nothing.
  const drag = useRef<{ x: number; y: number; view: ViewBox; panning: boolean } | null>(null);
  const textured = style === "textured";

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
      const selected = selectedCountry === id && id !== null;
      return (
        // biome-ignore lint/a11y/noStaticElementInteractions: role and keyboard handling are conditional on the country being selectable; Biome cannot verify a dynamic role expression
        <path
          key={shape.featureId}
          className={`map-country ${id === null ? "" : "cursor-pointer"}`}
          d={shape.path}
          fill={fillFor(mode, country, textured)}
          stroke={textured ? "var(--c-map-border)" : "var(--c-map-line)"}
          strokeWidth={selected ? 1.4 : textured ? 0.3 : 0.4}
          strokeOpacity={selected ? 1 : textured ? 0.45 : 1}
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
  }, [mode, textured, selectedCountry, onSelect, onContext, fingerprint]);

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

  // Markers are rebuilt only when the cities or the zoom change, not on every interpolated frame
  // the terminator asks for: at 178 cities that is the difference between a still map and a busy
  // one.
  const markerNodes = useMemo(
    () =>
      markers.map((marker) => {
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
                    : "var(--c-map-marker)"
              }
              // A light dot with a dark rim reads on the bright day texture and on the dark night
              // side alike, which a single-color marker does not.
              stroke="var(--c-map-marker-rim)"
              strokeWidth={1 / view.k ** 0.5}
              tabIndex={onSelect === undefined ? undefined : 0}
              role={onSelect === undefined ? undefined : "button"}
              aria-label={marker.label}
              className={onSelect === undefined ? "" : "cursor-pointer"}
              onClick={
                onSelect === undefined ? undefined : () => onSelect({ kind: "city", id: marker.id })
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
      }),
    [markers, view.k, onSelect, onContext],
  );

  const showNight = compact !== true && date !== undefined;
  const night = showNight ? nightPath(date, subHour) : "";
  // Both layers live in this one coordinate system, which is what keeps the rasters and the
  // vectors aligned; it is published on each group so a test can assert they match.
  const transform = `${view.x} ${view.y} ${MAP_WIDTH / view.k} ${MAP_HEIGHT / view.k}`;
  const maskId = `night-mask-${ids}`;
  const blurId = `night-blur-${ids}`;

  return (
    <div className={`relative h-full w-full overflow-hidden bg-bg ${className ?? ""}`}>
      <svg
        ref={svg}
        role="img"
        aria-label={t("map.title")}
        viewBox={transform}
        preserveAspectRatio="xMidYMid meet"
        className="h-full w-full touch-none select-none"
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <defs>
          <filter id={blurId} x="-5%" y="-5%" width="110%" height="110%">
            {/* A few degrees of blur is the dusk band; it also hides the polyline's corners. */}
            <feGaussianBlur stdDeviation="3" />
          </filter>
          <mask
            id={maskId}
            maskUnits="userSpaceOnUse"
            x="0"
            y="0"
            width={MAP_WIDTH}
            height={MAP_HEIGHT}
          >
            <rect x="0" y="0" width={MAP_WIDTH} height={MAP_HEIGHT} fill="#000" />
            {night === "" ? null : <path d={night} fill="#fff" filter={`url(#${blurId})`} />}
          </mask>
        </defs>

        <g data-testid="map-raster" data-map-transform={transform}>
          {textured ? (
            <>
              <image
                href={dayTexture}
                x="0"
                y="0"
                width={MAP_WIDTH}
                height={MAP_HEIGHT}
                preserveAspectRatio="none"
              />
              {showNight ? (
                <image
                  data-testid="map-night"
                  href={nightTexture}
                  x="0"
                  y="0"
                  width={MAP_WIDTH}
                  height={MAP_HEIGHT}
                  preserveAspectRatio="none"
                  mask={`url(#${maskId})`}
                />
              ) : null}
            </>
          ) : (
            <rect x="0" y="0" width={MAP_WIDTH} height={MAP_HEIGHT} fill="var(--c-bg)" />
          )}
        </g>

        <g data-testid="map-overlay" data-map-transform={transform}>
          <g data-testid="country-paths">{paths}</g>
          {showNight && !textured ? (
            <path d={night} fill="rgb(6 12 24 / 38%)" pointerEvents="none">
              <title>{t("map.night")}</title>
            </path>
          ) : null}
          <g data-testid="map-markers">{markerNodes}</g>
        </g>
      </svg>

      {compact === true ? null : (
        <>
          <section
            aria-label={t("map.legend")}
            className="pointer-events-none absolute bottom-2 start-2 flex items-center gap-2 rounded border border-line bg-panel/85 px-2 py-1 text-[0.7rem] text-muted"
          >
            <span>{t(`world.map_mode.${mode}`)}</span>
            <span aria-hidden="true" className="flex items-center gap-0.5">
              {[0.15, 0.4, 0.65, 0.9].map((step) => (
                <span
                  key={step}
                  className="block h-2 w-3 rounded-[1px]"
                  style={{ background: `rgb(${MODE_HUE[mode]} / ${Math.round(step * 80)}%)` }}
                />
              ))}
            </span>
            <span>{t(mode === "presence" ? "map.legend.presence" : "map.legend.scale")}</span>
          </section>
          <div className="absolute bottom-2 end-2 flex gap-1">
            <Button aria-label={t("map.zoom_in")} onClick={() => zoomBy(1.4)}>
              +
            </Button>
            <Button aria-label={t("map.zoom_out")} onClick={() => zoomBy(1 / 1.4)}>
              -
            </Button>
            <Button onClick={() => setView(INITIAL_VIEW)}>{t("map.reset")}</Button>
          </div>
        </>
      )}
    </div>
  );
}
