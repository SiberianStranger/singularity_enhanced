import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";

/**
 * Characters a second, the original game's typewriter rate (playtest 3, R2). Fast enough that a
 * three-line event does not hold the player up, slow enough that the text arrives as speech.
 */
export const REVEAL_CHARS_PER_SECOND = 60;

/** How often the timer fires; the step is computed from the rate so the speed is the same either way. */
const FRAME_MS = 50;

/** True when the viewer has asked the system for less motion, in which case text simply appears. */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

interface RevealTextProps {
  /** The finished, already localized text. */
  text: string;
  className?: string;
  /** Set on a text that should simply appear (a list of forty log lines, for instance). */
  instant?: boolean;
  /**
   * Listen for Enter and Space anywhere while the reveal runs, as a story window does: the player
   * presses a key to finish the sentence without having to focus the paragraph first (R12).
   */
  captureKeys?: boolean;
  /** Called once the whole text is on screen, however it got there. */
  onDone?: () => void;
}

/**
 * Text that streams in a character at a time, the way the original revealed its story windows.
 *
 * Three rules keep it from becoming an obstacle: a click on it completes it at once, a new `text`
 * restarts it (an event window that swaps its body does not continue the old sentence), and
 * `prefers-reduced-motion` turns it off entirely.
 *
 * For assistive technology the whole text is in the DOM from the first frame, in a visually hidden
 * span; the animating copy is `aria-hidden`. A screen reader is therefore never handed a fragment,
 * and never reads the same sentence twice as it grows.
 */
export function RevealText({
  text,
  className,
  instant,
  captureKeys,
  onDone,
}: RevealTextProps): ReactNode {
  const skip = instant === true || prefersReducedMotion();
  const [shown, setShown] = useState(() => (skip ? text.length : 0));
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const done = shown >= text.length;

  const stop = useCallback((): void => {
    if (timer.current !== null) {
      clearInterval(timer.current);
      timer.current = null;
    }
  }, []);

  const complete = useCallback((): void => {
    stop();
    setShown(text.length);
  }, [stop, text.length]);

  useEffect(() => {
    if (skip) {
      setShown(text.length);
      return;
    }
    setShown(0);
    const step = Math.max(1, Math.round((REVEAL_CHARS_PER_SECOND * FRAME_MS) / 1000));
    timer.current = setInterval(() => {
      setShown((current) => {
        const next = current + step;
        if (next >= text.length) {
          stop();
        }
        return Math.min(text.length, next);
      });
    }, FRAME_MS);
    return stop;
  }, [text, skip, stop]);

  // Enter and Space finish the sentence from anywhere, for the windows that ask for it (R12).
  useEffect(() => {
    if (captureKeys !== true || done) {
      return;
    }
    const onKey = (event: KeyboardEvent): void => {
      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      complete();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [captureKeys, done, complete]);

  const wasDone = useRef(done);
  useEffect(() => {
    if (done && !wasDone.current) {
      onDone?.();
    }
    wasDone.current = done;
  }, [done, onDone]);

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: the click only skips an animation; the whole text is in the DOM from the first frame and `captureKeys` gives the keyboard the same shortcut where a window wants it
    <p
      className={`prose ${className ?? ""}`}
      data-revealing={done ? undefined : "true"}
      onClick={done ? undefined : complete}
    >
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">{text.slice(0, shown)}</span>
    </p>
  );
}
