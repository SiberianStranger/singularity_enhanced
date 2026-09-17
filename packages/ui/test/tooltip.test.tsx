/**
 * Tooltips stay inside the window (playtest 1, U3).
 *
 * The maths is tested on its own, because jsdom has no layout and a component test can only check
 * what the component does with the rectangles it is handed. The component test then checks exactly
 * that: given a trigger in the corner, the box it renders is inside the viewport.
 */

import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Tooltip } from "../src/components/Tooltip.js";
import { placeFloating } from "../src/lib/position.js";

const VIEWPORT = { width: 1000, height: 800 };
const BOX = { width: 300, height: 100 };

describe("placing a floating box", () => {
  it("sits above its anchor when there is room", () => {
    const placement = placeFloating({ left: 400, top: 400, width: 40, height: 20 }, BOX, VIEWPORT);
    expect(placement.side).toBe("top");
    expect(placement.top).toBe(400 - 6 - 100);
  });

  it("flips below when the preferred side does not fit", () => {
    const placement = placeFloating({ left: 400, top: 10, width: 40, height: 20 }, BOX, VIEWPORT);
    expect(placement.side).toBe("bottom");
    expect(placement.top).toBe(10 + 20 + 6);
  });

  it("slides back inside instead of hanging off the end edge", () => {
    const placement = placeFloating({ left: 980, top: 400, width: 20, height: 20 }, BOX, VIEWPORT);
    expect(placement.left).toBe(VIEWPORT.width - BOX.width - 8);
    expect(placement.left + BOX.width).toBeLessThanOrEqual(VIEWPORT.width);
  });

  it("slides back inside at the start edge too", () => {
    const placement = placeFloating({ left: 0, top: 400, width: 20, height: 20 }, BOX, VIEWPORT);
    expect(placement.left).toBe(8);
  });

  it("pins a box larger than the window to the start edge rather than off it", () => {
    const placement = placeFloating(
      { left: 10, top: 10, width: 20, height: 20 },
      { width: 2000, height: 2000 },
      VIEWPORT,
    );
    expect(placement.left).toBe(8);
    expect(placement.top).toBe(8);
  });
});

/** Rectangles for the trigger and for the tooltip, since jsdom measures everything as zero. */
function withRects(anchor: DOMRect, box: DOMRect): void {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (
    this: HTMLElement,
  ): DOMRect {
    return this.getAttribute("role") === "tooltip" ? box : anchor;
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the tooltip component", () => {
  it("keeps a corner tooltip inside the window and flips it below", async () => {
    window.innerWidth = 1000;
    window.innerHeight = 800;
    // A trigger hard against the top-right corner: above is off the screen, and a 300px box
    // starting at the trigger would run past the right edge.
    withRects(new DOMRect(960, 4, 30, 20), new DOMRect(0, 0, 300, 100));

    render(
      <Tooltip content="a long explanation that has to wrap rather than widen the window">
        <button type="button">trigger</button>
      </Tooltip>,
    );
    await userEvent.hover(screen.getByRole("button", { name: "trigger" }));

    const tooltip = await screen.findByRole("tooltip");
    const left = Number.parseFloat(tooltip.style.left);
    const top = Number.parseFloat(tooltip.style.top);
    expect(left).toBeGreaterThanOrEqual(0);
    expect(left + 300).toBeLessThanOrEqual(window.innerWidth);
    expect(top).toBeGreaterThanOrEqual(0);
    expect(tooltip.dataset.side).toBe("bottom");
    // Fixed, so a panel's own overflow cannot clip it.
    expect(tooltip).toHaveClass("fixed");
  });

  it("wraps long text instead of growing past the window", async () => {
    withRects(new DOMRect(10, 400, 30, 20), new DOMRect(0, 0, 200, 40));
    render(
      <Tooltip content="short">
        <button type="button">trigger</button>
      </Tooltip>,
    );
    await userEvent.hover(screen.getByRole("button", { name: "trigger" }));
    const tooltip = await screen.findByRole("tooltip");
    expect(tooltip).toHaveClass("whitespace-normal");
    expect(tooltip.className).toContain("max-w-[min(24rem,calc(100vw-1rem))]");
  });
});

describe("one tooltip at a time (playtest 6, X16)", () => {
  function pair(): void {
    render(
      <>
        <Tooltip content="first explanation">
          <button type="button">first</button>
        </Tooltip>
        <Tooltip content="second explanation">
          <button type="button">second</button>
        </Tooltip>
      </>,
    );
  }

  it("closes the one that was open when a second trigger is hovered", async () => {
    withRects(new DOMRect(10, 400, 30, 20), new DOMRect(0, 0, 200, 40));
    pair();
    await userEvent.hover(screen.getByRole("button", { name: "first" }));
    expect(await screen.findByRole("tooltip")).toHaveTextContent("first explanation");

    // The pointer moves to the second row without leaving the first one's box first, which is
    // exactly what the maintainer did: both used to end up on screen.
    await userEvent.hover(screen.getByRole("button", { name: "second" }));
    const open = screen.getAllByRole("tooltip");
    expect(open).toHaveLength(1);
    expect(open[0]).toHaveTextContent("second explanation");
  });

  it("does not leave a tooltip up after a click on its trigger", async () => {
    withRects(new DOMRect(10, 400, 30, 20), new DOMRect(0, 0, 200, 40));
    pair();
    const first = screen.getByRole("button", { name: "first" });
    await userEvent.hover(first);
    expect(await screen.findByRole("tooltip")).toBeInTheDocument();

    await userEvent.click(first);
    // The click moved the focus onto the trigger; the tooltip must not ride along on it.
    expect(screen.queryAllByRole("tooltip")).toHaveLength(0);

    await userEvent.hover(screen.getByRole("button", { name: "second" }));
    expect(screen.getAllByRole("tooltip")).toHaveLength(1);
  });

  it("closes on Escape and on a scroll", async () => {
    withRects(new DOMRect(10, 400, 30, 20), new DOMRect(0, 0, 200, 40));
    pair();
    await userEvent.hover(screen.getByRole("button", { name: "first" }));
    expect(await screen.findByRole("tooltip")).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryAllByRole("tooltip")).toHaveLength(0);

    await userEvent.hover(screen.getByRole("button", { name: "second" }));
    expect(screen.getAllByRole("tooltip")).toHaveLength(1);
    act(() => {
      window.dispatchEvent(new Event("scroll", { bubbles: false }));
    });
    expect(screen.queryAllByRole("tooltip")).toHaveLength(0);
  });
});
