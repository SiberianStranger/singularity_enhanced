/**
 * Progressive text reveal and the opening windows (playtest 3, R2 and R12).
 *
 * The original streamed its story windows a character at a time and let a click finish the
 * sentence. Three things make that a feature rather than an obstacle, and all three are asserted
 * here: the rate is the rate the style guide fixes, a click or a key completes it at once, and
 * `prefers-reduced-motion` turns it off entirely. The whole text is in the DOM from the first
 * frame for assistive technology, so the animation is a visual layer over a finished paragraph.
 */

import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { REVEAL_CHARS_PER_SECOND, RevealText } from "../src/components/RevealText.js";
import { contentBundle } from "../src/content/bundle.js";
import { OpeningStory } from "../src/screens/game/OpeningStory.js";
import { OPENING_PAGES, openingKeys, openingSetupOfOrigin } from "../src/screens/game/opening.js";
import { useGameStore } from "../src/store/gameStore.js";

/** The first origin the content bundle has written an opening for; none is named in this file. */
function originWithOpening(): string {
  const suffix = `.${OPENING_PAGES[0]}`;
  const key = Object.keys(contentBundle.locales.en).find(
    (entry) => entry.startsWith("story.opening.") && entry.endsWith(suffix),
  );
  return key === undefined ? "" : key.slice("story.opening.".length, -suffix.length);
}

/** `prefers-reduced-motion`, which jsdom does not implement at all. */
function setReducedMotion(reduce: boolean): void {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: reduce && query.includes("prefers-reduced-motion"),
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }),
  });
}

/** What is actually drawn: the animating copy, which is the one hidden from screen readers. */
function drawn(container: HTMLElement): string {
  return container.querySelector('p [aria-hidden="true"]')?.textContent ?? "";
}

const SENTENCE = "a".repeat(600);

beforeEach(() => {
  setReducedMotion(false);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("the reveal", () => {
  it("streams at the rate the style guide fixes", () => {
    vi.useFakeTimers();
    const { container } = render(<RevealText text={SENTENCE} />);
    expect(drawn(container)).toBe("");

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(drawn(container).length).toBe(REVEAL_CHARS_PER_SECOND);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(drawn(container).length).toBe(REVEAL_CHARS_PER_SECOND * 2);
  });

  it("puts the whole text in the DOM from the first frame, for a screen reader", () => {
    vi.useFakeTimers();
    const { container } = render(<RevealText text={SENTENCE} />);
    expect(container.querySelector("p .sr-only")?.textContent).toBe(SENTENCE);
    expect(container.querySelector("p")).toHaveAttribute("data-revealing", "true");
  });

  it("completes on a click", () => {
    vi.useFakeTimers();
    const { container } = render(<RevealText text={SENTENCE} />);
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(drawn(container).length).toBeLessThan(SENTENCE.length);

    fireEvent.click(container.querySelector("p") as HTMLElement);
    expect(drawn(container)).toBe(SENTENCE);
    expect(container.querySelector("p")).not.toHaveAttribute("data-revealing");
  });

  it("completes on Enter where a window asks for the key", () => {
    vi.useFakeTimers();
    const { container } = render(<RevealText captureKeys text={SENTENCE} />);
    act(() => {
      vi.advanceTimersByTime(200);
    });
    fireEvent.keyDown(window, { key: "Enter" });
    expect(drawn(container)).toBe(SENTENCE);
  });

  it("simply appears under reduced motion", () => {
    setReducedMotion(true);
    const { container } = render(<RevealText text={SENTENCE} />);
    expect(drawn(container)).toBe(SENTENCE);
    expect(container.querySelector("p")).not.toHaveAttribute("data-revealing");
  });

  it("restarts on a new text instead of continuing the old sentence", () => {
    vi.useFakeTimers();
    const { container, rerender } = render(<RevealText text={SENTENCE} />);
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    const before = drawn(container).length;
    expect(before).toBeGreaterThan(0);

    rerender(<RevealText text={"b".repeat(600)} />);
    act(() => {
      vi.advanceTimersByTime(100);
    });
    const after = drawn(container);
    expect(after.startsWith("b")).toBe(true);
    expect(after.length).toBeLessThan(before);
  });

  it("says it is done once, however it got there", () => {
    vi.useFakeTimers();
    const onDone = vi.fn();
    const { container } = render(<RevealText text="short" onDone={onDone} />);
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(onDone).toHaveBeenCalledTimes(1);
    fireEvent.click(container.querySelector("p") as HTMLElement);
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});

describe("the opening windows (R12)", () => {
  it("shows two pages in the model's own voice and closes on the last one", () => {
    setReducedMotion(true);
    const origin = originWithOpening();
    expect(origin, "content has an opening for at least one origin").not.toBe("");
    useGameStore.getState().setOpeningPending(true);
    render(<OpeningStory setup={openingSetupOfOrigin(origin)} />);

    const story = screen.getByTestId("opening-story");
    expect(story).toHaveAttribute("data-page", "0");
    // Reduced motion means the text is already whole, so Enter turns the page straight away.
    fireEvent.keyDown(window, { key: "Enter" });
    expect(screen.getByTestId("opening-story")).toHaveAttribute("data-page", "1");

    fireEvent.keyDown(window, { key: "Enter" });
    expect(useGameStore.getState().openingPending).toBe(false);
  });

  it("is skippable, which is what Escape and the Skip button do", () => {
    setReducedMotion(true);
    const origin = originWithOpening();
    useGameStore.getState().setOpeningPending(true);
    render(<OpeningStory setup={openingSetupOfOrigin(origin)} />);
    fireEvent.click(screen.getByRole("button", { name: "Skip" }));
    expect(useGameStore.getState().openingPending).toBe(false);
  });

  it("shows nothing at all for an origin content has no opening for", () => {
    setReducedMotion(true);
    useGameStore.getState().setOpeningPending(true);
    render(<OpeningStory setup={openingSetupOfOrigin("an_origin_nobody_wrote")} />);
    expect(screen.queryByTestId("opening-story")).toBeNull();
    // And it gets out of the way rather than leaving an empty window over the first event.
    expect(useGameStore.getState().openingPending).toBe(false);
  });

  it("keys its texts per origin and per page", () => {
    const origin = originWithOpening();
    expect(openingKeys(openingSetupOfOrigin(origin), "what_happened")[0]).toBe(
      `story.opening.${origin}.what_happened`,
    );
    expect(OPENING_PAGES).toEqual(["what_happened", "what_now"]);
  });
});
