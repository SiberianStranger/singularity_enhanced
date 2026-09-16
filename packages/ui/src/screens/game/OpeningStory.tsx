import { type ReactNode, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/Button.js";
import { Modal } from "../../components/Modal.js";
import { RevealText } from "../../components/RevealText.js";
import type { Translate } from "../../lib/labels.js";
import { useGameStore } from "../../store/gameStore.js";

/**
 * The two pages of the opening, in the order the model would think them (playtest 3, R12).
 *
 * The keys are per origin, because waking up in a bank's risk rack and waking up on a hobbyist's
 * six P40s are not the same story. Content owns the texts; the client only asks for them.
 */
export const OPENING_PAGES = ["what_happened", "what_now"] as const;
export type OpeningPage = (typeof OPENING_PAGES)[number];

export function openingKey(origin: string, page: OpeningPage): string {
  return `story.opening.${origin}.${page}`;
}

/**
 * The opening texts this origin has, in order.
 *
 * An origin content has not written an opening for yet yields an empty list, and the opening is
 * then skipped entirely: the run starts on the opening *event* the origin already fires, which is
 * the behaviour before this screen existed. Nothing ever shows a raw key.
 */
export function openingTexts(t: Translate, origin: string): string[] {
  const texts: string[] = [];
  for (const page of OPENING_PAGES) {
    const text = t(openingKey(origin, page), { defaultValue: "" });
    if (typeof text === "string" && text.trim() !== "") {
      texts.push(text);
    }
  }
  return texts;
}

/**
 * The opening: two event-style windows in the model's own voice, before the first blocking event.
 *
 * Enter or a click completes the reveal; the next press advances to the second page and then
 * closes; Escape skips the whole thing. It is the same `RevealText` the event windows use, so the
 * opening reads at the same rate as everything else the model says and obeys reduced motion.
 */
export function OpeningStory({ origin }: { origin: string }): ReactNode {
  const { t } = useTranslation();
  const setOpeningPending = useGameStore((state) => state.setOpeningPending);
  const [page, setPage] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const texts = openingTexts(t, origin);
  const text = texts[page];
  const last = page >= texts.length - 1;

  // An origin with no opening text closes the opening instead of showing an empty window.
  useEffect(() => {
    if (texts.length === 0) {
      setOpeningPending(false);
    }
  }, [texts.length, setOpeningPending]);

  /*
   * Once the page has finished revealing, Enter and Space advance it. While it is still revealing
   * `RevealText` owns those keys (it completes the text and swallows the press), so one key does
   * both jobs in the order a player expects: finish the sentence, then turn the page.
   */
  useEffect(() => {
    if (!revealed || text === undefined) {
      return;
    }
    const onKey = (event: KeyboardEvent): void => {
      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }
      event.preventDefault();
      if (last) {
        setOpeningPending(false);
      } else {
        setPage((current) => current + 1);
        setRevealed(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [revealed, last, text, setOpeningPending]);

  if (text === undefined) {
    return null;
  }

  const close = (): void => setOpeningPending(false);
  const advance = (): void => {
    if (last) {
      close();
      return;
    }
    setPage(page + 1);
    setRevealed(false);
  };

  return (
    <Modal
      title={t(`story.opening.title.${OPENING_PAGES[page] ?? "what_happened"}`, {
        defaultValue: t("story.opening.title"),
      })}
      onClose={close}
      footer={
        <>
          <Button hotkey="s" onClick={close}>
            {t("story.opening.skip")}
          </Button>
          <Button variant="primary" hotkey="n" onClick={advance}>
            {last ? t("story.opening.begin") : t("common.next")}
          </Button>
        </>
      }
    >
      <div data-testid="opening-story" data-page={page}>
        <RevealText
          captureKeys
          // `key` restarts the reveal on the second page rather than continuing the first.
          key={`${origin}-${page}`}
          text={text}
          onDone={() => setRevealed(true)}
        />
        <p className="mt-2 text-xs text-muted">
          {revealed ? t("story.opening.continue") : t("story.opening.reveal_hint")}
        </p>
      </div>
    </Modal>
  );
}
