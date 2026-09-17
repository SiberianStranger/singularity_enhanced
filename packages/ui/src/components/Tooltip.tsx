import {
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { type Placement, placeFloating, viewportSize } from "../lib/position.js";

/**
 * One tooltip at a time (playtest 6, X16).
 *
 * Every tooltip used to keep its own `open`, opened by hover and by focus alike, so clicking a row
 * left that row's tooltip up on focus while moving the pointer to the next row opened a second one
 * beside it. The open one is held here instead: whoever opens closes whoever was open, the last
 * trigger wins, and a few things that should clear the screen close it from outside.
 */
let openTooltip: (() => void) | null = null;
let listening = false;

function closeOpenTooltip(): void {
  const close = openTooltip;
  openTooltip = null;
  close?.();
}

/** Escape, a scroll anywhere and the pointer leaving the document all dismiss what is open. */
function listenOnce(): void {
  if (listening || typeof document === "undefined") {
    return;
  }
  listening = true;
  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === "Escape") {
      closeOpenTooltip();
    }
  };
  window.addEventListener("keydown", onKeyDown, true);
  window.addEventListener("scroll", closeOpenTooltip, true);
  document.addEventListener("pointerleave", closeOpenTooltip);
}

/** Whether this focus came from the keyboard; a focus a click produced does not open a tooltip. */
function keyboardFocus(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }
  try {
    return target.matches(":focus-visible");
  } catch {
    // A DOM that does not implement the selector (jsdom) cannot tell a click from a Tab, and the
    // tooltip is the accessible description of the control, so there it opens.
    return true;
  }
}

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
  /** Set by the pointer press that is about to move the focus here, so that focus opens nothing. */
  const pressed = useRef(false);

  /** What the registry calls on this tooltip when another one takes over. */
  const close = useCallback(() => setOpen(false), []);

  /** Opens this one and closes whatever was open; the last trigger wins. */
  const show = useCallback(() => {
    listenOnce();
    if (openTooltip !== null) {
      const previous = openTooltip;
      openTooltip = null;
      previous();
    }
    openTooltip = close;
    setOpen(true);
  }, [close]);

  const hide = useCallback(() => {
    if (openTooltip === close) {
      openTooltip = null;
    }
    setOpen(false);
  }, [close]);

  // A tooltip that is unmounted while open (a list that re-renders under the pointer) must not
  // leave the registry pointing at a closer that does nothing.
  useEffect(() => hide, [hide]);

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
    // Scrolling closes the tooltip (X16) rather than dragging it along, so only a resize has to
    // be followed while it is up.
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [open, measure]);

  return (
    <span
      ref={anchor}
      role="note"
      className={`relative inline-flex ${className ?? ""}`}
      onMouseEnter={show}
      onMouseLeave={hide}
      // A click is not a request for the description: it closes this trigger's hover tooltip
      // rather than pinning it open through the focus that follows (X16).
      onPointerDown={() => {
        pressed.current = true;
        hide();
      }}
      onFocusCapture={(event) => {
        if (pressed.current) {
          pressed.current = false;
          return;
        }
        if (keyboardFocus(event.target)) {
          show();
        }
      }}
      onBlurCapture={() => {
        pressed.current = false;
        hide();
      }}
    >
      {/*
       * `flex-1` so the trigger fills the anchor: a tooltip wrapped around a parameter row asks
       * for `w-full` on the anchor, and without this the row inside it shrank to its own content
       * and its value stopped lining up with the rows that carry no tooltip. On an anchor sized by
       * its content, which is every other use, filling it changes nothing.
       */}
      <span aria-describedby={open ? id : undefined} className="inline-flex min-w-0 flex-1">
        {children}
      </span>
      {open ? (
        <span
          ref={box}
          role="tooltip"
          id={id}
          data-side={placement?.side ?? side}
          className="pointer-events-none fixed z-100 max-w-[min(24rem,calc(100vw-1rem))] whitespace-normal break-words border border-linestrong bg-panel px-2 py-1 text-xs leading-snug text-fg"
          style={{
            // Physical`left`/`top`, not logical insets: these are viewport coordinates measured
            // with`getBoundingClientRect`, which is physical in both writing directions.
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
