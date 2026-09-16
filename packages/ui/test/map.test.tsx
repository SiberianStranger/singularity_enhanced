import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { DateView } from "@singularity/core";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MAP_HEIGHT, MAP_WIDTH, project } from "../src/screens/game/map/projection.js";
import { nightPath, subsolarLongitude } from "../src/screens/game/map/terminator.js";
import { countryShapes } from "../src/screens/game/map/topology.js";
import { clampY, WorldMap, wrapX } from "../src/screens/game/map/WorldMap.js";
import { useUiStore } from "../src/store/uiStore.js";

/**
 * jsdom has no `PointerEvent`, so Testing Library would send a bare `Event` with no `button` and
 * the map's pan handlers would ignore it. This defines one over `MouseEvent` for the duration of a
 * test, which is enough for the properties the handlers read.
 */
function withPointerEvents(body: () => void): void {
  const holder = globalThis as unknown as { PointerEvent?: unknown };
  const previous = holder.PointerEvent;
  class TestPointerEvent extends MouseEvent {
    readonly pointerId: number;
    constructor(type: string, init: MouseEventInit & { pointerId?: number } = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 1;
    }
  }
  holder.PointerEvent = TestPointerEvent;
  try {
    body();
  } finally {
    holder.PointerEvent = previous;
  }
}

describe("world map", () => {
  it("decodes over a hundred country shapes from the atlas", () => {
    const shapes = countryShapes();
    expect(shapes.length).toBeGreaterThan(100);
    expect(shapes.filter((shape) => shape.id !== null).length).toBeGreaterThan(100);
  });

  it("renders every shape as an SVG path", () => {
    const { container } = render(<WorldMap markers={[]} />);
    const paths = container.querySelectorAll('[data-testid="country-paths"] path');
    expect(paths.length).toBeGreaterThan(100);
    expect(screen.getByRole("img", { name: /world map/i })).toBeInTheDocument();
  });

  it("draws a night side that moves with the clock", () => {
    const noon = nightPath({
      year: 2027,
      month: 6,
      day: 21,
      hour: 12,
      weekday: 1,
      iso: "2027-06-21",
    });
    const midnight = nightPath({
      year: 2027,
      month: 6,
      day: 21,
      hour: 0,
      weekday: 1,
      iso: "2027-06-21",
    });
    expect(noon.startsWith("M")).toBe(true);
    expect(noon).not.toEqual(midnight);
  });

  it("places city markers and labels them", () => {
    render(
      <WorldMap
        markers={[{ id: "berlin", lat: 52.52, lon: 13.4, label: "Berlin", badge: 2 }]}
        onSelect={() => undefined}
      />,
    );
    expect(screen.getByRole("button", { name: "Berlin" })).toBeInTheDocument();
  });

  it("selects the city a marker stands for", () => {
    const onSelect = vi.fn();
    render(
      <WorldMap
        markers={[{ id: "berlin", lat: 52.52, lon: 13.4, label: "Berlin" }]}
        onSelect={onSelect}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Berlin" }));
    expect(onSelect).toHaveBeenCalledWith({ kind: "city", id: "berlin" });
  });

  it("does not pan, or capture the pointer, until the pointer has moved", () => {
    // Capturing on pointerdown retargets the click to the svg, which loses every marker click.
    withPointerEvents(() => {
      const map = render(<WorldMap markers={[]} onSelect={() => undefined} />);
      const svg = map.container.querySelector("svg") as SVGSVGElement;
      const capture = vi.fn();
      Object.assign(svg, {
        setPointerCapture: capture,
        releasePointerCapture: vi.fn(),
        hasPointerCapture: () => true,
        getBoundingClientRect: () => new DOMRect(0, 0, 1000, 500),
      });
      // At zoom 1 the whole map is on screen and panning is clamped away, so zoom in first.
      fireEvent.click(screen.getByRole("button", { name: /zoom in/i }));
      const before = svg.getAttribute("viewBox");

      fireEvent.pointerDown(svg, { button: 0, clientX: 100, clientY: 100, pointerId: 1 });
      fireEvent.pointerMove(svg, { clientX: 102, clientY: 100, pointerId: 1 });
      expect(capture).not.toHaveBeenCalled();
      expect(svg.getAttribute("viewBox")).toBe(before);

      fireEvent.pointerMove(svg, { clientX: 160, clientY: 100, pointerId: 1 });
      expect(capture).toHaveBeenCalledWith(1);
      expect(svg.getAttribute("viewBox")).not.toBe(before);
      fireEvent.pointerUp(svg, { pointerId: 1 });
    });
  });
});

/**
 * Points of one SVG subpath, in order. `geoPath` writes "M x,y L x,y Z" per ring, so splitting on
 * the move command gives the rings and the numbers inside each one give its points.
 */
function subpaths(path: string): { x: number; y: number }[][] {
  return path
    .split("M")
    .filter((part) => part.trim() !== "")
    .map((part) => {
      const numbers = part.match(/-?\d+(?:\.\d+)?/g) ?? [];
      const points: { x: number; y: number }[] = [];
      for (let index = 0; index + 1 < numbers.length; index += 2) {
        points.push({ x: Number(numbers[index]), y: Number(numbers[index + 1]) });
      }
      return points;
    });
}

/** Ray casting, in projected coordinates: is this point inside the polygon? */
function contains(polygon: { x: number; y: number }[], point: { x: number; y: number }): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const a = polygon[i] as { x: number; y: number };
    const b = polygon[j] as { x: number; y: number };
    const straddles = a.y > point.y !== b.y > point.y;
    if (straddles && point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x) {
      inside = !inside;
    }
  }
  return inside;
}

const JUNE_MIDNIGHT: DateView = {
  year: 2027,
  month: 6,
  day: 21,
  hour: 0,
  weekday: 1,
  iso: "2027-06-21",
};

describe("antimeridian (playtest 1, U4)", () => {
  it("draws Russia without a segment that spans half the world", () => {
    // The old hand-rolled projection mapped longitude straight to x, so the Chukotka rings that
    // cross 180 degrees came back as a band across the whole map. d3-geo clips there instead.
    const russia = countryShapes().find((shape) => shape.name === "Russia");
    expect(russia, "the atlas has Russia").toBeDefined();
    const rings = subpaths((russia as { path: string }).path);
    expect(rings.length).toBeGreaterThan(1);

    const longest = rings.flatMap((ring) =>
      ring.slice(1).map((point, index) => Math.abs(point.x - (ring[index] as { x: number }).x)),
    );
    expect(Math.max(...longest)).toBeLessThan(MAP_WIDTH / 2);
  });

  it("keeps every other shape inside half a world per segment too", () => {
    const offenders: string[] = [];
    for (const shape of countryShapes()) {
      for (const ring of subpaths(shape.path)) {
        for (let index = 1; index < ring.length; index += 1) {
          const from = ring[index - 1] as { x: number; y: number };
          const to = ring[index] as { x: number; y: number };
          // A polygon that encloses a pole is closed along that pole, which is one long
          // horizontal segment on the top or bottom edge of a plate carree. Antarctica is the
          // only shape that does it, and it is the projection working, not an artifact.
          const alongPole = Math.abs(from.y - to.y) < 1 && (from.y < 1 || from.y > MAP_HEIGHT - 1);
          if (Math.abs(to.x - from.x) >= MAP_WIDTH / 2 && !alongPole) {
            offenders.push(shape.name);
          }
        }
      }
    }
    expect([...new Set(offenders)]).toEqual([]);
  });
});

describe("the textured map (playtest 1, U11)", () => {
  it("covers the night side with the night texture and nothing else", () => {
    // Midnight UTC in June: Greenwich is dark, and the sunlit side is a quarter of a turn away.
    const polygon = subpaths(nightPath(JUNE_MIDNIGHT))[0] as { x: number; y: number }[];
    expect(contains(polygon, project(0, 0))).toBe(true);
    expect(contains(polygon, project(180, 0))).toBe(false);
  });

  it("draws the raster and the vector layer in the same transform", () => {
    const { container } = render(<WorldMap markers={[]} date={JUNE_MIDNIGHT} />);
    const raster = container.querySelector('[data-testid="map-raster"]');
    const overlay = container.querySelector('[data-testid="map-overlay"]');
    expect(raster?.getAttribute("data-map-transform")).toBe(
      overlay?.getAttribute("data-map-transform"),
    );

    // And the raster fills exactly the projected world, so the two line up degree for degree.
    const day = raster?.querySelector("image");
    expect(day?.getAttribute("width")).toBe(String(MAP_WIDTH));
    expect(day?.getAttribute("height")).toBe(String(MAP_HEIGHT));

    const night = container.querySelector('[data-testid="map-night"]');
    expect(night?.getAttribute("mask")).toMatch(/^url\(#night-mask-/);
  });

  it("falls back to the flat vector look when the player asks for it", () => {
    const { container } = render(<WorldMap markers={[]} date={JUNE_MIDNIGHT} style="vector" />);
    expect(container.querySelector('[data-testid="map-night"]')).toBeNull();
    expect(container.querySelector('[data-testid="map-raster"] image')).toBeNull();
  });

  it("slides the terminator between ticks instead of jumping an hour at a time", () => {
    const whole = nightPath(JUNE_MIDNIGHT);
    const halfway = nightPath(JUNE_MIDNIGHT, 0.5);
    const nextHour = nightPath({ ...JUNE_MIDNIGHT, hour: 1 });
    expect(halfway).not.toEqual(whole);
    expect(halfway).not.toEqual(nextHour);

    // Halfway through the hour the sun has moved half of the fifteen degrees it moves in one.
    // Read away from the wrap at the date line, where the average of two longitudes means nothing.
    const morning = { ...JUNE_MIDNIGHT, hour: 6 };
    expect(subsolarLongitude(morning, 0.5)).toBeCloseTo(
      (subsolarLongitude(morning) + subsolarLongitude({ ...morning, hour: 7 })) / 2,
      6,
    );
  });
});

describe("highlights are the shape of the country (playtest 3, R3)", () => {
  it("adds no element of its own when a country spanning the world is selected", () => {
    // The finding was a frame across the whole map when Russia was picked. A selection may only
    // change how the country's own clipped path is drawn: same elements, same geometry.
    const russia = countryShapes().find((shape) => shape.name === "Russia");
    expect(russia?.id, "the atlas has Russia and the bundle models it").toBeTruthy();

    const plain = render(<WorldMap markers={[]} onSelect={() => undefined} />);
    const before = plain.container.querySelectorAll('[data-testid="country-paths"] *').length;
    const beforePath = plain.container.querySelector(
      `[data-testid="country-paths"] path[d="${(russia as { path: string }).path}"]`,
    ) as SVGPathElement;
    expect(beforePath).not.toBeNull();
    plain.unmount();

    const picked = render(
      <WorldMap
        markers={[]}
        selectedCountry={(russia as { id: string }).id}
        onSelect={() => undefined}
      />,
    );
    const after = picked.container.querySelectorAll('[data-testid="country-paths"] *');
    expect(after.length).toBe(before);
    // No rectangle, no bounding box, no second layer: only paths and their titles.
    expect([...after].filter((node) => node.tagName.toLowerCase() === "rect")).toEqual([]);
    const afterPath = picked.container.querySelector(
      `[data-testid="country-paths"] path[d="${(russia as { path: string }).path}"]`,
    ) as SVGPathElement;
    expect(afterPath.getAttribute("d")).toBe(beforePath.getAttribute("d"));
    // What did change is the stroke, which is the highlight.
    expect(afterPath.getAttribute("stroke-width")).not.toBe(
      beforePath.getAttribute("stroke-width"),
    );
  });

  it("replaces the focus ring rather than removing it", () => {
    // A rectangle around the bounding box is exactly the bug; the stylesheet has to put a visible
    // indicator back in the shape of the country.
    const css = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "../src/styles/index.css"),
      "utf8",
    );
    const rule = css.slice(css.indexOf(".map-country:focus"));
    const block = rule.slice(rule.indexOf("{"), rule.indexOf("}"));
    expect(block).toContain("outline: none");
    expect(block).toContain("stroke");
    expect(block).toContain("stroke-width");
  });
});

describe("pan, zoom and the wrap (playtest 3, R14)", () => {
  it("wraps longitude and clamps latitude", () => {
    expect(wrapX(MAP_WIDTH + 10)).toBeCloseTo(10);
    expect(wrapX(-10)).toBeCloseTo(MAP_WIDTH - 10);
    expect(wrapX(0)).toBe(0);
    // At zoom 1 the whole world is on screen, so there is nowhere to go vertically.
    expect(clampY(-50, 1)).toBe(0);
    expect(clampY(50, 1)).toBe(0);
    expect(clampY(MAP_HEIGHT, 2)).toBe(MAP_HEIGHT / 2);
  });

  it("draws the world twice while the view box crosses the antimeridian", () => {
    // The layers tile horizontally, so crossing the date line is one extra copy of the same
    // elements one map width to the right, and nothing else.
    const copies = (root: HTMLElement): number =>
      root.querySelectorAll('[data-testid="map-overlay"] > g').length;

    const one = render(<WorldMap markers={[]} view={{ x: 0, y: 0, k: 2 }} />);
    expect(copies(one.container)).toBe(1);
    one.unmount();

    // Pushed east far enough that the right-hand edge of the view is past the date line.
    const two = render(<WorldMap markers={[]} view={{ x: MAP_WIDTH - 10, y: 0, k: 2 }} />);
    expect(copies(two.container)).toBe(2);
    const second = two.container.querySelectorAll('[data-testid="map-overlay"] > g')[1];
    expect(second?.getAttribute("transform")).toBe(`translate(${MAP_WIDTH} 0)`);
  });

  it("pans with the arrow keys and zooms with plus and minus", () => {
    let view = { x: 0, y: 0, k: 2 };
    const onViewChange = vi.fn((next: typeof view) => {
      view = next;
    });
    const { container } = render(
      <WorldMap markers={[]} view={view} onViewChange={onViewChange} onSelect={() => undefined} />,
    );
    const svg = container.querySelector("svg") as SVGSVGElement;

    fireEvent.keyDown(svg, { key: "ArrowRight" });
    expect(view.x).toBeGreaterThan(0);
    const east = view.x;

    fireEvent.keyDown(svg, { key: "ArrowDown" });
    expect(view.y).toBeGreaterThan(0);

    // West past zero wraps round the world instead of stopping at an edge.
    view = { x: 5, y: 0, k: 2 };
    fireEvent.keyDown(svg, { key: "ArrowLeft" });
    expect(view.x).toBeGreaterThan(MAP_WIDTH / 2);
    expect(east).toBeGreaterThan(0);

    view = { x: 0, y: 0, k: 2 };
    fireEvent.keyDown(svg, { key: "+" });
    expect(view.k).toBeGreaterThan(2);
    view = { x: 0, y: 0, k: 2 };
    fireEvent.keyDown(svg, { key: "-" });
    expect(view.k).toBeLessThan(2);
  });

  it("keeps where the map is looking in the session store, and out of the settings", () => {
    // The game screen hands the map the store's view, so opening a window or switching a panel
    // cannot throw the player back to the middle of the Atlantic.
    useUiStore.getState().setMapView({ x: 100, y: 20, k: 3 });
    const first = render(
      <WorldMap
        markers={[]}
        view={useUiStore.getState().mapView}
        onViewChange={useUiStore.getState().setMapView}
      />,
    );
    const box = first.container.querySelector("svg")?.getAttribute("viewBox");
    first.unmount();

    // A remount, which is what a panel switch does to the map.
    const second = render(<WorldMap markers={[]} view={useUiStore.getState().mapView} />);
    expect(second.container.querySelector("svg")?.getAttribute("viewBox")).toBe(box);

    // It is session state, not a setting: nothing of it reaches localStorage.
    const stored = JSON.parse(window.localStorage.getItem("singularity.ui") ?? "{}");
    expect(stored.state?.mapView).toBeUndefined();
    useUiStore.getState().setMapView({ x: 0, y: 0, k: 1 });
  });
});

describe("city dots carry their state (playtest 3, R7)", () => {
  const MARKERS = [
    {
      id: "london",
      lat: 51.5,
      lon: -0.1,
      label: "London",
      country: "gb",
      active: true,
      note: "12 CH/d",
    },
    { id: "paris", lat: 48.9, lon: 2.4, label: "Paris", country: "fr" },
    { id: "lyon", lat: 45.8, lon: 4.8, label: "Lyon", country: "fr" },
  ];

  it("glows only where the player runs a live site", () => {
    const { container } = render(<WorldMap markers={MARKERS} onSelect={() => undefined} />);
    expect(container.querySelector('[data-testid="marker-london"]')).toHaveAttribute(
      "data-lit",
      "true",
    );
    expect(container.querySelector('[data-testid="marker-glow-london"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="marker-paris"]')).toHaveAttribute(
      "data-lit",
      "false",
    );
    expect(container.querySelector('[data-testid="marker-glow-paris"]')).toBeNull();
  });

  it("carries the numbers that save a click on a site dot", () => {
    const { container } = render(<WorldMap markers={MARKERS} onSelect={() => undefined} />);
    expect(container.querySelector('[data-testid="marker-note-london"]')?.textContent).toBe(
      "12 CH/d",
    );
    expect(container.querySelector('[data-testid="marker-note-paris"]')).toBeNull();
  });

  it("lights a country's own dots while the pointer is on it, and dims them again", () => {
    withPointerEvents(() => {
      const { container } = render(<WorldMap markers={MARKERS} onSelect={() => undefined} />);
      const france = container.querySelector(
        '[data-testid="country-paths"] path[role="button"]',
      ) as SVGPathElement;
      expect(france).not.toBeNull();

      // Whichever country the first path is, its own dots are the ones that light up.
      const shape = countryShapes().find((entry) => entry.path === france.getAttribute("d"));
      const lit = MARKERS.filter((marker) => marker.country === shape?.id).map(
        (marker) => marker.id,
      );
      fireEvent.pointerEnter(france);
      for (const id of lit) {
        expect(container.querySelector(`[data-testid="marker-${id}"]`)).toHaveAttribute(
          "data-lit",
          "true",
        );
      }
      fireEvent.pointerLeave(france);
      for (const id of lit) {
        expect(container.querySelector(`[data-testid="marker-${id}"]`)).toHaveAttribute(
          "data-lit",
          MARKERS.find((marker) => marker.id === id)?.active === true ? "true" : "false",
        );
      }
    });
  });

  it("lights the same dots from the keyboard as from the pointer", () => {
    const { container } = render(<WorldMap markers={MARKERS} onSelect={() => undefined} />);
    const first = container.querySelector(
      '[data-testid="country-paths"] path[role="button"]',
    ) as SVGPathElement;
    const shape = countryShapes().find((entry) => entry.path === first.getAttribute("d"));
    const own = MARKERS.filter((marker) => marker.country === shape?.id).map((marker) => marker.id);

    fireEvent.focus(first);
    for (const id of own) {
      expect(container.querySelector(`[data-testid="marker-${id}"]`)).toHaveAttribute(
        "data-lit",
        "true",
      );
    }
    fireEvent.blur(first);
  });
});
