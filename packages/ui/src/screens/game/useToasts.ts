import type { Notification, Severity, TextVar } from "@singularity/core";
import { useCallback, useEffect, useRef, useState } from "react";
import { playSound } from "../../audio/index.js";
import { useGameStore } from "../../store/gameStore.js";
import {
  modeFor,
  pauses,
  shouldBatchToasts,
  showsPopup,
  showsToast,
  TECH_DONE_ALERT,
} from "../../store/selectors.js";
import { useUiStore } from "../../store/uiStore.js";

export const TOAST_MS = 5000;

export interface Toast {
  id: string;
  key: string;
  vars: Record<string, TextVar>;
  severity: Severity;
  link?: Notification["link"];
  /** Set on the batched toast that stands in for several alerts at high speed. */
  batch?: number;
  expiresAt: number;
}

export interface ToastApi {
  toasts: Toast[];
  popups: Notification[];
  dismiss(id: string): void;
  dismissPopup(id: string): void;
  setPaused(paused: boolean): void;
}

/**
 * Routes incoming notifications to toasts and popups according to the message settings, batching
 * them into one toast at speed 4 and above (SYS-11). Hovering the stack pauses every timer.
 */
export function useToasts(): ToastApi {
  const notifications = useGameStore((state) => state.view?.notifications);
  const speed = useGameStore((state) => state.view?.speed ?? 0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [popups, setPopups] = useState<Notification[]>([]);
  const seen = useRef(new Set<string>());
  const paused = useRef(false);

  useEffect(() => {
    if (notifications === undefined) {
      return;
    }
    const { messagePreset, messageModes, noteAlertKey, techWindow } = useUiStore.getState();
    const fresh = notifications.filter((notification) => !seen.current.has(notification.id));
    if (fresh.length === 0) {
      return;
    }
    const now = Date.now();
    const nextToasts: Toast[] = [];
    const nextPopups: Notification[] = [];
    let batched = 0;
    let shouldPause = false;

    for (const notification of fresh) {
      seen.current.add(notification.id);
      noteAlertKey(notification.key);
      // A finished technology has a window of its own while the player wants one (playtest 8, Z7);
      // a toast as well would say the same thing twice and expire under the window.
      if (techWindow && notification.key === TECH_DONE_ALERT) {
        continue;
      }
      const mode = modeFor(notification.key, notification.severity, messagePreset, messageModes);
      if (showsPopup(mode)) {
        nextPopups.push(notification);
        shouldPause = shouldPause || pauses(mode);
        continue;
      }
      if (!showsToast(mode)) {
        continue;
      }
      if (shouldBatchToasts(speed)) {
        batched += 1;
        continue;
      }
      nextToasts.push({
        id: notification.id,
        key: notification.key,
        vars: notification.vars,
        severity: notification.severity,
        ...(notification.link === undefined ? {} : { link: notification.link }),
        expiresAt: now + TOAST_MS,
      });
    }

    if (batched > 0) {
      nextToasts.push({
        id: `batch_${now}`,
        key: "game.toast.batched",
        vars: { count: batched },
        severity: "info",
        batch: batched,
        expiresAt: now + TOAST_MS,
      });
    }
    if (nextToasts.length > 0) {
      setToasts((current) => [...current, ...nextToasts].slice(-6));
    }
    if (nextPopups.length > 0) {
      setPopups((current) => [...current, ...nextPopups]);
    }
    // One sound per batch of arrivals, not one per notification: at speed 5 a tick can raise six
    // alerts, and six overlapping beeps are noise rather than an alert (style guide rule 10).
    if (nextPopups.length > 0) {
      playSound("event");
    } else if (nextToasts.length > 0) {
      playSound("alert");
    }
    if (shouldPause) {
      useGameStore.getState().setSpeed(0);
    }
  }, [notifications, speed]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (paused.current) {
        setToasts((current) =>
          current.map((toast) => ({ ...toast, expiresAt: toast.expiresAt + 500 })),
        );
        return;
      }
      const now = Date.now();
      setToasts((current) => current.filter((toast) => toast.expiresAt > now));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const dismissPopup = useCallback((id: string) => {
    setPopups((current) => current.filter((popup) => popup.id !== id));
  }, []);

  const setPaused = useCallback((value: boolean) => {
    paused.current = value;
  }, []);

  return { toasts, popups, dismiss, dismissPopup, setPaused };
}
