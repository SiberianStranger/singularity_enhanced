import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { nightPath } from "../src/screens/game/map/terminator.js";
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
