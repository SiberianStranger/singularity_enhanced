import type { CountryView, DateView } from "@singularity/core";
import {
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
  useCallback,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import dayTexture from "../../../assets/earth.jpg";
import nightTexture from "../../../assets/earth_night.jpg";
import { Button } from "../../../components/Button.js";
import { countryName } from "../../../lib/labels.js";
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
  /** Country the city is in, so hovering a country can light its own dots (playtest 3, R7). */
  country?: string;
  /** The player runs a live site here: this dot glows while the rest stay dim. */
  active?: boolean;
  /**
   * The short block a site dot carries: compute, status, the loudest exposure channel. Already
   * localized and short enough to sit next to a dot without covering the map.
   */
  note?: string;
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
  /**
   * Where the map is looking. When the caller supplies it (the game screen reads it from the UI
   * store, so panning survives a remount), the component is controlled; otherwise it keeps its own.
   */
  view?: ViewBox;
  onViewChange?(view: ViewBox): void;
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

/**
 * The fill of a country the bundle does not model (playtest 3, R6).
 *
 * It is land, drawn as land: a faint neutral wash over the raster, the land color under the vector
 * style. What it is not is a hole in the map, which is how an uncolored shape read.
 */
const UNMODELLED_FILL_TEXTURED = "rgb(160 160 190 / 8%)";

function fillFor(mode: MapMode, country: CountryView | undefined, textured: boolean): string {
  const base = textured ? "transparent" : "var(--c-map-land)";
  if (country === undefined) {
    return textured ? UNMODELLED_FILL_TEXTURED : "var(--c-map-land)";
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

/** Zoom bounds; 1 is the whole world, 12 is a city block's worth of a country. */
const MIN_ZOOM = 1;
const MAX_ZOOM = 12;

/** Share of the visible width or height one arrow-key press moves the map (playtest 3, R14). */
const KEY_PAN_FRACTION = 0.15;

/**
 * Longitude wraps, so the map does too (playtest 3, R14).
 *
 * The plate carree layers tile horizontally by construction: the pixel at x = MAP_WIDTH is the
 * pixel at x = 0. Panning east past the antimeridian therefore only needs the same content drawn
 * once more, one map width to the right, and the view box's x kept inside [0, MAP_WIDTH). That is
 * what lets a player pushed off the Americas by the primary panel simply keep dragging west
 * instead of being clamped against an edge.
 */
export function wrapX(x: number): number {
  return ((x % MAP_WIDTH) + MAP_WIDTH) % MAP_WIDTH;
}

/** Latitude does not wrap: the view box is clamped so the poles stay at the edges. */
export function clampY(y: number, k: number): number {
  const height = MAP_HEIGHT / k;
  return Math.min(MAP_HEIGHT - height, Math.max(0, y));
}

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
  view: controlledView,
  onViewChange,
}: WorldMapProps): ReactNode {
  const { t } = useTranslation();
  const svg = useRef<SVGSVGElement>(null);
  const ids = useId();
  const [ownView, setOwnView] = useState<ViewBox>(INITIAL_VIEW);
  const view = controlledView ?? ownView;
  const setView = useCallback(
    (next: ViewBox): void => {
      // Every writer goes through here, so the wrap and the clamp are applied in one place and a
      // handler cannot produce a view box that shows the edge of the world.
      const fixed = {
        k: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next.k)),
        x: wrapX(next.x),
        y: clampY(next.y, Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next.k))),
      };
      if (onViewChange === undefined) {
        setOwnView(fixed);
      } else {
        onViewChange(fixed);
      }
    },
    [onViewChange],
  );
  // Panning starts only once the pointer has actually moved: capturing on pointerdown would
  // retarget the click to the svg, and a click on a city marker would select nothing.
  const drag = useRef<{ x: number; y: number; view: ViewBox; panning: boolean } | null>(null);
  const textured = style === "textured";
  // Which country the pointer is over, so its cities light up while the rest of the map stays dim
  // (playtest 3, R7). It is view state, not game state: nothing outside this component reads it.
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);

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
          // Hovering a country lights its own cities (playtest 3, R7). Focus does the same, so a
          // player moving through the map with the keyboard sees the same thing as one with a mouse.
          onPointerEnter={id === null ? undefined : () => setHoveredCountry(id)}
          onPointerLeave={id === null ? undefined : () => setHoveredCountry(null)}
          onFocus={id === null ? undefined : () => setHoveredCountry(id)}
          onBlur={id === null ? undefined : () => setHoveredCountry(null)}
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
          {/* The atlas ships English names; the bundle has the translated one (SYS-14). */}
          <title>{id === null ? shape.name : countryName(t, id)}</title>
        </path>
      );
    });
  }, [mode, textured, selectedCountry, onSelect, onContext, fingerprint, t]);

  const onWheel = (event: ReactWheelEvent<SVGSVGElement>): void => {
    if (compact === true) {
      return;
    }
    const rect = svg.current?.getBoundingClientRect();
    if (rect === undefined) {
      return;
    }
    const factor = event.deltaY < 0 ? 1.2 : 1 / 1.2;
    const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, view.k * factor));
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;
    const worldX = view.x + px * (MAP_WIDTH / view.k);
    const worldY = view.y + py * (MAP_HEIGHT / view.k);
    // Zoom toward the pointer: the world point under it stays under it.
    setView({
      k: next,
      x: worldX - px * (MAP_WIDTH / next),
      y: worldY - py * (MAP_HEIGHT / next),
    });
  };

  const onPointerDown = (event: ReactPointerEvent<SVGSVGElement>): void => {
    if (compact === true || event.button !== 0) {
      return;
    }
    // Focus the map so the arrows pan it straight away; a click is how a player says "this one".
    svg.current?.focus({ preventScroll: true });
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
    // The horizontal drag is not clamped: `setView` wraps it round the antimeridian instead.
    setView({ k: start.view.k, x: start.view.x - dx, y: start.view.y - dy });
  };

  const onPointerUp = (event: ReactPointerEvent<SVGSVGElement>): void => {
    if (drag.current?.panning === true && event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    drag.current = null;
  };

  const zoomBy = (factor: number): void => {
    const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, view.k * factor));
    setView({
      k: next,
      x: view.x + (MAP_WIDTH / view.k - MAP_WIDTH / next) / 2,
      y: view.y + (MAP_HEIGHT / view.k - MAP_HEIGHT / next) / 2,
    });
  };

  /**
   * Keyboard pan and zoom (playtest 3, R14).
   *
   * The arrows move the view by a fraction of what is visible, so one press means the same thing
   * at every zoom; plus and minus do what the two buttons in the corner do. The map takes focus on
   * a pointer press, so "click the map, then use the arrows" works without a visible focus step.
   */
  const onKeyDown = (event: ReactKeyboardEvent<SVGSVGElement>): void => {
    if (compact === true) {
      return;
    }
    const stepX = (MAP_WIDTH / view.k) * KEY_PAN_FRACTION;
    const stepY = (MAP_HEIGHT / view.k) * KEY_PAN_FRACTION;
    switch (event.key) {
      case "ArrowLeft":
        event.preventDefault();
        setView({ ...view, x: view.x - stepX });
        return;
      case "ArrowRight":
        event.preventDefault();
        setView({ ...view, x: view.x + stepX });
        return;
      case "ArrowUp":
        event.preventDefault();
        setView({ ...view, y: view.y - stepY });
        return;
      case "ArrowDown":
        event.preventDefault();
        setView({ ...view, y: view.y + stepY });
        return;
      case "+":
      case "=":
        event.preventDefault();
        zoomBy(1.4);
        return;
      case "-":
      case "_":
        event.preventDefault();
        zoomBy(1 / 1.4);
        return;
      default:
    }
  };

  // Markers are rebuilt only when the cities or the zoom change, not on every interpolated frame
  // the terminator asks for: at 178 cities that is the difference between a still map and a busy
  // one.
  /**
   * City dots (playtest 3, R7).
   *
   * Before, every dot on the map was drawn at full brightness, so a hundred and seventy cities
   * competed with the four the player actually has. Now brightness carries meaning:
   *
   *   - a dot the player runs a live site in glows, always, with a halo behind it;
   *   - the selected dot and the candidate dots of an open dialog stay bright, as they did;
   *   - a dot in the country under the pointer lights up while the pointer is there;
   *   - every other dot is dim.
   *
   * A site dot may also carry a short block of numbers next to it (`note`), which is what makes
   * the map readable at a glance instead of a field of identical points.
   */
  const markerNodes = useMemo(
    () =>
      markers.map((marker) => {
        const point = project(marker.lon, marker.lat);
        const lit =
          marker.active === true ||
          marker.selected === true ||
          marker.candidate === true ||
          (marker.country !== undefined && marker.country === hoveredCountry);
        const radius =
          (marker.selected === true ? 4 : marker.active === true ? 3.5 : 3) +
          Math.min(3, marker.badge ?? 0);
        const scale = view.k ** 0.5;
        const fill =
          marker.selected === true
            ? "var(--c-accent)"
            : marker.candidate === true
              ? "rgb(87 168 255 / 60%)"
              : "var(--c-map-marker)";
        return (
          <g key={marker.id} data-testid={`marker-${marker.id}`} data-lit={lit ? "true" : "false"}>
            {marker.active === true ? (
              // The glow is a second, wider circle rather than an SVG filter: a filter on a
              // hundred and seventy markers costs a repaint, and this costs a circle.
              <circle
                data-testid={`marker-glow-${marker.id}`}
                cx={point.x}
                cy={point.y}
                r={(radius + 3) / scale}
                fill="rgb(87 168 255 / 28%)"
                stroke="rgb(140 200 255 / 55%)"
                strokeWidth={0.8 / scale}
                pointerEvents="none"
              />
            ) : null}
            {/* biome-ignore lint/a11y/noStaticElementInteractions: role and keyboard handling below are conditional on onSelect; Biome cannot verify a dynamic role expression */}
            <circle
              className={`map-marker ${onSelect === undefined ? "" : "cursor-pointer"}`}
              cx={point.x}
              cy={point.y}
              r={radius / scale}
              fill={fill}
              // Dim by default: the opacity, not the color, carries the state, so the dot keeps
              // reading on the day texture and on the night side alike.
              fillOpacity={lit ? 1 : 0.35}
              stroke="var(--c-map-marker-rim)"
              strokeWidth={1 / scale}
              strokeOpacity={lit ? 1 : 0.4}
              tabIndex={onSelect === undefined ? undefined : 0}
              role={onSelect === undefined ? undefined : "button"}
              aria-label={marker.label}
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
            {marker.note === undefined || marker.note === "" ? null : (
              <text
                data-testid={`marker-note-${marker.id}`}
                x={point.x + (radius + 3) / scale}
                y={point.y + 2 / scale}
                // The block is sized in map units divided by the zoom, so it stays one size on
                // screen however far in the player is.
                fontSize={7 / scale}
                fill="var(--c-map-marker)"
                stroke="var(--c-map-marker-rim)"
                strokeWidth={1.6 / scale}
                paintOrder="stroke"
                pointerEvents="none"
                className="font-mono"
              >
                {marker.note}
              </text>
            )}
          </g>
        );
      }),
    [markers, view.k, onSelect, onContext, hoveredCountry],
  );

  const showNight = compact !== true && date !== undefined;
  const night = showNight ? nightPath(date, subHour) : "";
  /*
   * Horizontal offsets the layers are drawn at (playtest 3, R14). One copy is enough until the
   * view box runs off the right-hand edge of the world, and then a second copy one map width to
   * the right closes the seam. The copies hold the same React elements, so the country under the
   * pointer is selectable on either side of the antimeridian, and the extra hundred and seventy
   * paths only exist while the player is actually looking across it.
   */
  const wrapped = view.x + MAP_WIDTH / view.k > MAP_WIDTH;
  const offsets = wrapped ? [0, MAP_WIDTH] : [0];
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
        className="h-full w-full touch-none select-none focus:outline-none"
        tabIndex={compact === true ? undefined : 0}
        onKeyDown={onKeyDown}
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
          {offsets.map((offset) => (
            <g key={offset} transform={offset === 0 ? undefined : `translate(${offset} 0)`}>
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
                      data-testid={offset === 0 ? "map-night" : undefined}
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
          ))}
        </g>

        <g data-testid="map-overlay" data-map-transform={transform}>
          {offsets.map((offset) => (
            <g key={offset} transform={offset === 0 ? undefined : `translate(${offset} 0)`}>
              <g data-testid={offset === 0 ? "country-paths" : undefined}>{paths}</g>
              {showNight && !textured ? (
                <path d={night} fill="rgb(6 12 24 / 38%)" pointerEvents="none">
                  <title>{t("map.night")}</title>
                </path>
              ) : null}
              <g data-testid={offset === 0 ? "map-markers" : undefined}>{markerNodes}</g>
            </g>
          ))}
        </g>
      </svg>

      {compact === true ? null : (
        <>
          <section
            aria-label={t("map.legend")}
            className="pointer-events-none absolute bottom-2 start-2 flex items-center gap-2 border border-line bg-panel/85 px-2 py-1 text-xs text-muted"
          >
            <span>{t(`world.map_mode.${mode}`)}</span>
            <span aria-hidden="true" className="flex items-center gap-0.5">
              {[0.15, 0.4, 0.65, 0.9].map((step) => (
                <span
                  key={step}
                  className="block h-2 w-3"
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
