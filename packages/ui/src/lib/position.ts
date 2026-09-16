/**
 * Placing a floating box (a tooltip, a context menu) so it stays inside the viewport.
 *
 * Playtest 1 found text running off the screen edge: a tooltip anchored above its trigger is cut
 * off at the top of the window, and one anchored at the start edge runs past the right edge in a
 * narrow panel. The rule Paradox panels use is flip then shift: try the preferred side, use the
 * opposite one when the preferred one does not fit, then slide along the other axis until the box
 * is inside, never letting it leave the viewport.
 *
 * The maths is here, away from React, so it can be tested without a layout engine: jsdom has no
 * layout at all, and the component only feeds it measured rectangles.
 */

export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface Size {
  width: number;
  height: number;
}

export type Side = "top" | "bottom";

export interface Placement {
  /** Viewport coordinates for `position: fixed`. */
  left: number;
  top: number;
  /** Which side of the anchor the box ended up on. */
  side: Side;
}

export interface PlaceOptions {
  /** Gap between the anchor and the box. */
  gap?: number;
  /** Smallest distance the box keeps from the viewport edge. */
  margin?: number;
  /** Side to try first. */
  prefer?: Side;
}

function clamp(value: number, min: number, max: number): number {
  // A box taller or wider than the viewport pins to the start edge rather than to a negative one.
  return max < min ? min : Math.min(max, Math.max(min, value));
}

/**
 * Where to put `floating` so that it points at `anchor` and stays inside `viewport`.
 *
 * The preferred side is tried first; if the box does not fit there and fits on the other side, it
 * flips. Either way the result is clamped into the viewport, so a box that fits nowhere is still
 * fully visible, overlapping its anchor instead of leaving the screen.
 */
export function placeFloating(
  anchor: Rect,
  floating: Size,
  viewport: Size,
  options: PlaceOptions = {},
): Placement {
  const gap = options.gap ?? 6;
  const margin = options.margin ?? 8;
  const prefer = options.prefer ?? "top";

  const above = anchor.top - gap - floating.height;
  const below = anchor.top + anchor.height + gap;
  const fitsAbove = above >= margin;
  const fitsBelow = below + floating.height <= viewport.height - margin;

  let side: Side = prefer;
  if (prefer === "top" && !fitsAbove && fitsBelow) {
    side = "bottom";
  } else if (prefer === "bottom" && !fitsBelow && fitsAbove) {
    side = "top";
  }

  const top = clamp(
    side === "top" ? above : below,
    margin,
    viewport.height - floating.height - margin,
  );
  // Centred on the anchor, then slid back inside; centring keeps a wide tooltip from hanging off
  // one side of a narrow trigger.
  const centered = anchor.left + anchor.width / 2 - floating.width / 2;
  const left = clamp(centered, margin, viewport.width - floating.width - margin);

  return { left, top, side };
}

/** The viewport size, or a sane default where there is no window (tests, server rendering). */
export function viewportSize(): Size {
  if (typeof window === "undefined") {
    return { width: 1024, height: 768 };
  }
  return {
    width: window.innerWidth || 1024,
    height: window.innerHeight || 768,
  };
}
