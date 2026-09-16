import { type ReactNode, useCallback, useId, useLayoutEffect, useRef, useState } from "react";
import { type Placement, placeFloating, viewportSize } from "../lib/position.js";

interface TooltipProps {
  /** Tooltip body; already localized by the caller. */
  content: ReactNode;
  children: ReactNode;
  className?: string;
  /** Side to try first; the box flips to the other one when the preferred side does not fit. */
  side?: "top" | "bottom";
}

/**
 * Hover and focus tooltip. It is a real element rather than a `title` attribute so it can hold
 * several lines (an indicator's contributing values, an option's effect list, a blocked action's
 * reason) and be read by screen readers through `aria-describedby`.
 *
 * Positioning is `fixed` and measured (`lib/position.ts`): the box escapes the scroll containers
 * and the panel edges it used to be clipped by, flips to the other side of its trigger when it
 * does not fit, and slides back inside the viewport rather than running off it (playtest 1, U3).
 * Long text wraps instead of widening the box past the screen.
 */
export function Tooltip({ content, children, className, side = "top" }: TooltipProps): ReactNode {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<Placement | null>(null);
  const anchor = useRef<HTMLSpanElement>(null);
  const box = useRef<HTMLSpanElement>(null);

  const measure = useCallback(() => {
    const trigger = anchor.current;
    const floating = box.current;
    if (trigger === null || floating === null) {
      return;
    }
    const triggerRect = trigger.getBoundingClientRect();
    const floatingRect = floating.getBoundingClientRect();
    setPlacement(
      placeFloating(
        {
          left: triggerRect.left,
          top: triggerRect.top,
          width: triggerRect.width,
          height: triggerRect.height,
        },
        { width: floatingRect.width, height: floatingRect.height },
        viewportSize(),
        { prefer: side },
      ),
    );
  }, [side]);

  // Measured before paint, so the box never appears at the wrong place for one frame. It is
  // rendered hidden until it has been measured, which is also what gives it a size to measure.
  useLayoutEffect(() => {
    if (!open) {
      setPlacement(null);
      return;
    }
    measure();
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [open, measure]);

  return (
    <span
      ref={anchor}
      role="note"
      className={`relative inline-flex ${className ?? ""}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocusCapture={() => setOpen(true)}
      onBlurCapture={() => setOpen(false)}
    >
      <span aria-describedby={open ? id : undefined} className="inline-flex">
        {children}
      </span>
      {open ? (
        <span
          ref={box}
          role="tooltip"
          id={id}
          data-side={placement?.side ?? side}
          className="pointer-events-none fixed z-100 max-w-[min(20rem,calc(100vw-1rem))] whitespace-normal break-words rounded border border-line bg-panel2 px-2 py-1 text-xs leading-snug text-fg shadow-lg"
          style={{
            // Physical `left`/`top`, not logical insets: these are viewport coordinates measured
            // with `getBoundingClientRect`, which is physical in both writing directions.
            left: placement?.left ?? 0,
            top: placement?.top ?? 0,
            visibility: placement === null ? "hidden" : "visible",
          }}
        >
          {content}
        </span>
      ) : null}
    </span>
  );
}
