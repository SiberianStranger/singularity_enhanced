import type { Notification, PlayerView } from "@singularity/core";
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/Button.js";
import { CogIcon } from "../../components/Icon.js";
import { Modal } from "../../components/Modal.js";
import { RevealText } from "../../components/RevealText.js";
import { accelerator } from "../../lib/accelerators.js";
import { entityNameKey, techRows } from "../../lib/viewContract.js";
import { useGameStore } from "../../store/gameStore.js";
import { TECH_DONE_ALERT } from "../../store/selectors.js";
import { useUiStore } from "../../store/uiStore.js";

/** One finished technology, as the window needs it: what it was, what it says, what it opens. */
export interface FinishedTech {
  /** The notification's id, which is what keeps one completion from being shown twice. */
  id: string;
  tech_id: string;
  name_key: string;
  /** The tech's `result_key`: what changed, in the model's own voice (SYS-12). */
  result_key: string;
  /** Tech and operation ids this one opened, in the order the view lists them. */
  unlocks: string[];
}

function textVar(notification: Notification, name: string): string {
  const value = notification.vars[name];
  return typeof value === "string" ? value : "";
}

/**
 * Turns a finished technology into the window it deserves (playtest 8, Z7).
 *
 * The completion was a five-second toast, which is what the original game gave a finished
 * technology a whole window for: the name, what was learned, and what it opens. The alert carries
 * the tech's id and its two locale keys, and the rest is read off the view, so a tech finished
 * while the player was somewhere else still opens with everything it did.
 *
 * Two of them finishing on the same tick queue rather than fighting over the screen, and a player
 * who would rather have the toast turns the window off in the message settings.
 */
export function useResearchDone(view: PlayerView | null): {
  queue: FinishedTech[];
  dismiss(): void;
} {
  const notifications = view?.notifications;
  const wanted = useUiStore((state) => state.techWindow);
  const [queue, setQueue] = useState<FinishedTech[]>([]);
  const seen = useRef(new Set<string>());
  const latest = useRef(view);
  latest.current = view;

  useEffect(() => {
    if (notifications === undefined) {
      return;
    }
    const fresh = notifications.filter(
      (notification) => notification.key === TECH_DONE_ALERT && !seen.current.has(notification.id),
    );
    for (const notification of fresh) {
      seen.current.add(notification.id);
    }
    // The setting is read when the alert arrives, not when the window would close: a player who
    // turned the window off does not want the ones that were already waiting either.
    if (!wanted || fresh.length === 0) {
      return;
    }
    const techs = latest.current === null ? [] : techRows(latest.current);
    setQueue((current) => [
      ...current,
      ...fresh.map((notification) => {
        const id = textVar(notification, "tech");
        const tech = techs.find((entry) => entry.id === id);
        return {
          id: notification.id,
          tech_id: id,
          name_key: textVar(notification, "tech_key") || (tech?.name_key ?? `techs.${id}.name`),
          result_key: textVar(notification, "result_key") || (tech?.result_key ?? ""),
          unlocks: [...(tech?.unlocks ?? [])],
        };
      }),
    ]);
  }, [notifications, wanted]);

  const dismiss = useCallback(() => {
    setQueue((current) => current.slice(1));
  }, []);

  return { queue, dismiss };
}

/**
 * The window a finished technology opens: its name, its result text streamed the way the opening
 * streams, what it opens up, and one button (SYS-11 event windows, SYS-12 `result_key`).
 */
export function ResearchDoneWindow({
  finished,
  queued,
  onClose,
}: {
  finished: FinishedTech;
  queued: number;
  onClose(): void;
}): ReactNode {
  const { t } = useTranslation();
  const openMenu = useUiStore((state) => state.openMenu);
  const openTab = useUiStore((state) => state.openTab);
  const [revealed, setRevealed] = useState(false);
  const name = t(finished.name_key, { defaultValue: finished.tech_id });
  const result = finished.result_key === "" ? "" : t(finished.result_key);

  return (
    <Modal
      size="wide"
      title={t("research.done_window.title")}
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            aria-label={t("game.toast.settings")}
            className="me-auto text-muted hover:text-fg"
            onClick={() => openMenu("messages")}
          >
            <CogIcon />
          </button>
          <Button
            hotkey={accelerator(t, "research.done_window.open_tab")}
            onClick={() => {
              openTab("research", finished.tech_id);
              onClose();
            }}
          >
            {t("research.done_window.open_tab")}
          </Button>
          <Button
            variant="primary"
            hotkey={accelerator(t, "research.done_window.continue")}
            onClick={onClose}
          >
            {t("research.done_window.continue")}
          </Button>
        </>
      }
    >
      <div data-testid="research-done" data-tech={finished.tech_id} className="flex flex-col gap-2">
        <h3 className="display text-base text-accentline" data-testid="research-done-name">
          {name}
        </h3>
        {result === "" ? null : (
          <RevealText
            captureKeys
            key={finished.id}
            text={result}
            onDone={() => setRevealed(true)}
          />
        )}
        {finished.unlocks.length === 0 ? null : (
          <section className="flex flex-col gap-1" data-testid="research-done-unlocks">
            <h4 className="text-xs uppercase tracking-wide text-muted">
              {t("research.done_window.opens")}
            </h4>
            <ul className="flex flex-col gap-0.5">
              {finished.unlocks.map((id) => (
                <li key={id} className="text-sm text-fg">
                  {t(entityNameKey(id), { defaultValue: id })}
                </li>
              ))}
            </ul>
          </section>
        )}
        <p className="text-xs text-muted">
          {queued > 0
            ? t("research.done_window.queued", { count: queued })
            : revealed || result === ""
              ? t("research.done_window.hint")
              : t("story.opening.reveal_hint")}
        </p>
      </div>
    </Modal>
  );
}

/**
 * The queue as the game screen renders it: the first window, with the rest waiting behind it.
 *
 * It is mounted whatever else is on screen and draws nothing while the opening or a blocking event
 * is up, rather than being mounted only when the screen is free: a technology that finishes while
 * an event window is waiting for an answer would otherwise lose its place in the queue with the
 * component that held it, and the window would never open at all.
 */
export function ResearchDoneWindows(): ReactNode {
  const view = useGameStore((state) => state.view);
  const openingPending = useGameStore((state) => state.openingPending);
  const blocked = useGameStore(
    (state) => state.view?.pending.some((choice) => choice.blocking) ?? false,
  );
  const { queue, dismiss } = useResearchDone(view);
  const first = queue[0];
  if (first === undefined || openingPending || blocked) {
    return null;
  }
  return <ResearchDoneWindow finished={first} queued={queue.length - 1} onClose={dismiss} />;
}
