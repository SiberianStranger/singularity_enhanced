/**
 * Derived data for the alert bar, the toast stack and the message settings panel (SYS-11).
 *
 * Channel, severity and pausability are independent: an alert type can be a toast and an icon at
 * once, and only the modes that say "popup" may stop the game. The routing table below turns the
 * player's coarse preset plus their per-key overrides into the one mode a notification is handled
 * with.
 */

import type { Notification, PendingChoice, PlayerView, Severity } from "@singularity/core";
import type { MessageMode, MessagePreset } from "./uiStore.js";

/**
 * The alert a finished technology raises (SYS-12 `alerts.tech_researched`).
 *
 * It is named here because two places read it: the window a completion opens (playtest 8, Z7) and
 * the toast stack, which leaves it alone while that window is the channel for it.
 */
export const TECH_DONE_ALERT = "alerts.tech_researched";

export const SEVERITY_RANK: Readonly<Record<Severity, number>> = {
  critical: 0,
  warning: 1,
  opportunity: 2,
  info: 3,
};

export const SEVERITIES: readonly Severity[] = ["critical", "warning", "opportunity", "info"];

const PRESET_DEFAULTS: Readonly<Record<MessagePreset, Record<Severity, MessageMode>>> = {
  quiet: {
    critical: "toast",
    warning: "icon_only",
    opportunity: "log_only",
    info: "log_only",
  },
  default: {
    critical: "toast",
    warning: "toast",
    opportunity: "icon_only",
    info: "icon_only",
  },
  verbose: {
    critical: "popup",
    warning: "toast",
    opportunity: "toast",
    info: "toast",
  },
};

/** The mode one notification is handled with, after preset and per-key overrides. */
export function modeFor(
  key: string,
  severity: Severity,
  preset: MessagePreset,
  overrides: Readonly<Record<string, MessageMode>>,
): MessageMode {
  return overrides[key] ?? PRESET_DEFAULTS[preset][severity];
}

export function presetModeFor(severity: Severity, preset: MessagePreset): MessageMode {
  return PRESET_DEFAULTS[preset][severity];
}

export function showsIcon(mode: MessageMode): boolean {
  return mode !== "log_only";
}

export function showsToast(mode: MessageMode): boolean {
  return mode === "toast" || mode === "popup" || mode === "popup_and_pause";
}

export function showsPopup(mode: MessageMode): boolean {
  return mode === "popup" || mode === "popup_and_pause";
}

export function pauses(mode: MessageMode): boolean {
  return mode === "popup_and_pause";
}

export interface AlertGroup {
  key: string;
  severity: Severity;
  /** The most recent notification of the group; its vars render the label. */
  latest: Notification;
  count: number;
  unread: number;
  ids: string[];
}

/**
 * Groups notifications by key and orders them by severity, then recency, which is the order the
 * alert bar shows its icons in.
 */
export function groupAlerts(notifications: readonly Notification[]): AlertGroup[] {
  const groups = new Map<string, AlertGroup>();
  for (const notification of notifications) {
    const existing = groups.get(notification.key);
    if (existing === undefined) {
      groups.set(notification.key, {
        key: notification.key,
        severity: notification.severity,
        latest: notification,
        count: 1,
        unread: notification.read ? 0 : 1,
        ids: [notification.id],
      });
      continue;
    }
    existing.count += 1;
    existing.unread += notification.read ? 0 : 1;
    existing.ids.push(notification.id);
    if (notification.tick >= existing.latest.tick) {
      existing.latest = notification;
      existing.severity = notification.severity;
    }
  }
  return [...groups.values()].sort((a, b) => {
    const bySeverity = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
    return bySeverity !== 0 ? bySeverity : b.latest.tick - a.latest.tick;
  });
}

export function unreadCount(view: PlayerView | null): number {
  return (view?.notifications ?? []).filter((notification) => !notification.read).length;
}

export function blockingChoices(view: PlayerView | null): PendingChoice[] {
  return (view?.pending ?? []).filter((choice) => choice.blocking);
}

/** Toasts are batched into one summary at speed 4 and above (SYS-11). */
export function shouldBatchToasts(speed: number): boolean {
  return speed >= 4;
}
