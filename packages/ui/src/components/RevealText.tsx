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
  /**
   * Keep the growing end of the text in view while it streams, the way a terminal follows its own
   * output. Set by the opening, whose composed windows can be taller than the dialog they are in
   * (playtest 6, X2); a text inside a panel does not ask for it, because scrolling a panel the
   * player is not looking at is rude.
   */
  follow?: boolean;
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
  follow,
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

  /*
   * `onDone` fires on the edge into "done", including the very first render.
   *
   * Seeding this with `done` looked tidier and was wrong: under reduced motion, and for an
   * `instant` text, the paragraph is complete on its first frame, the edge never arrives and a
   * window waiting for it never learns that its text is on screen. The opening then refused to
   * turn its page from the keyboard for exactly the players who had asked for less motion (R12).
   */
  const wasDone = useRef(false);
  useEffect(() => {
    if (done && !wasDone.current) {
      onDone?.();
    }
    wasDone.current = done;
  }, [done, onDone]);

  /*
   * The end of the text stays in view while it streams. `block: "nearest"` moves the scrollable
   * ancestor only when the tail has left it, so a text that fits its window never moves at all,
   * and the player can still scroll back the moment the reveal is over.
   */
  const tail = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (follow !== true || done || shown === 0) {
      return;
    }
    if (typeof tail.current?.scrollIntoView !== "function") {
      return;
    }
    tail.current.scrollIntoView({ block: "nearest" });
  }, [follow, done, shown]);

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: the click only skips an animation; the whole text is in the DOM from the first frame and `captureKeys` gives the keyboard the same shortcut where a window wants it
    <p
      /*
       * `whitespace-pre-line`: content writes these texts one thought to a line, and the opening
       * composes a window out of several paragraphs separated by a blank line (playtest 6, X2).
       * Without it every line break collapsed and a window arrived as one wall of text.
       */
      className={`prose whitespace-pre-line ${className ?? ""}`}
      data-revealing={done ? undefined : "true"}
      onClick={done ? undefined : complete}
    >
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">{text.slice(0, shown)}</span>
      <span ref={tail} aria-hidden="true" />
    </p>
  );
}
