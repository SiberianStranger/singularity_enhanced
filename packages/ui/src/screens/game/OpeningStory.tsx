import { type ReactNode, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/Button.js";
import { Modal } from "../../components/Modal.js";
import { RevealText } from "../../components/RevealText.js";
import { accelerator } from "../../lib/accelerators.js";
import { useGameStore } from "../../store/gameStore.js";
import { OPENING_PAGES, type OpeningSetup, openingTexts } from "./opening.js";

/**
 * The opening: two event-style windows in the model's own voice, before the first blocking event.
 *
 * Each window is composed out of short paragraphs keyed by the axes of the setup rather than being
 * one text per origin (playtest 6, X2); `opening.ts` owns that composition and this file owns the
 * window. Enter or a click completes the reveal; the next press advances to the second page and
 * then closes; Escape skips the whole thing. It is the same `RevealText` the event windows use, so
 * the opening reads at the same rate as everything else the model says and obeys reduced motion.
 */
export function OpeningStory({ setup }: { setup: OpeningSetup }): ReactNode {
  const { t } = useTranslation();
  const setOpeningPending = useGameStore((state) => state.setOpeningPending);
  const [page, setPage] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const texts = openingTexts(t, setup);
  const text = texts[page];
  const last = page >= texts.length - 1;

  // A setup with no opening text closes the opening instead of showing an empty window.
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
      // Wide, because a composed window is four paragraphs rather than one and a narrow column
      // pushed the last of them under the fold at 1280 by 720 (playtest 6, X2).
      size="wide"
      title={t(`story.opening.title.${OPENING_PAGES[page] ?? "what_happened"}`, {
        defaultValue: t("story.opening.title"),
      })}
      onClose={close}
      footer={
        <>
          <Button hotkey={accelerator(t, "story.opening.skip")} onClick={close}>
            {t("story.opening.skip")}
          </Button>
          <Button
            variant="primary"
            hotkey={accelerator(t, last ? "story.opening.begin" : "common.next")}
            onClick={advance}
          >
            {last ? t("story.opening.begin") : t("common.next")}
          </Button>
        </>
      }
    >
      <div data-testid="opening-story" data-page={page}>
        <RevealText
          captureKeys
          follow
          // `key` restarts the reveal on the second page rather than continuing the first.
          key={`${setup.origin}-${page}`}
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
