import type { DateView } from "@singularity/core";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MAP_HEIGHT, MAP_WIDTH, project } from "../src/screens/game/map/projection.js";
import { nightPath, subsolarLongitude } from "../src/screens/game/map/terminator.js";
import { countryShapes } from "../src/screens/game/map/topology.js";
import { WorldMap } from "../src/screens/game/map/WorldMap.js";

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
