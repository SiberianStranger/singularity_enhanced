/**
 * Notifications system: turns `notify` effects into the persisted alert list.
 *
 * Runs last in the tick so it sees every message emitted during that tick. The engine also calls
 * `flush` after a command, because resolving an event may raise alerts while the clock is paused.
 */

import { daysToTicks } from "../../kernel/clock.js";
import type { NotifyMessage } from "../../kernel/outbox.js";
import type { System, SystemContext } from "../../kernel/system.js";
import { type Notification, playerNotifications, type World } from "../../kernel/world.js";

export interface NotificationsOptions {
  /** An identical alert within this window is dropped instead of repeated. */
  dedupeWindowDays?: number;
  /** Default lifetime of an alert; a message may override it with `expire_days`. */
  expireDays?: number;
}

export const NOTIFICATIONS_SYSTEM_ORDER = 900;

export interface NotificationsSystem extends System {
  flush(world: World, ctx: SystemContext): void;
}

function dedupeKey(message: NotifyMessage): string {
  const link = message.link;
  return `${message.key}|${link?.panel ?? ""}|${link?.id ?? ""}`;
}

function notificationDedupeKey(notification: Notification): string {
  const link = notification.link;
  return `${notification.key}|${link?.panel ?? ""}|${link?.id ?? ""}`;
}

export function createNotificationsSystem(options: NotificationsOptions = {}): NotificationsSystem {
  const dedupeWindowTicks = daysToTicks(options.dedupeWindowDays ?? 1);
  const expireDays = options.expireDays ?? 30;

  const flush = (world: World, ctx: SystemContext): void => {
    const tick = world.clock.tick;
    for (const message of ctx.outbox.read().notify) {
      const list = playerNotifications(world, message.playerId);
      const key = dedupeKey(message);
      const duplicate = list.some(
        (existing) =>
          notificationDedupeKey(existing) === key && tick - existing.tick < dedupeWindowTicks,
      );
      if (duplicate) {
        continue;
      }
      world.counters.notifications += 1;
      const lifetimeDays = message.expire_days ?? expireDays;
      const expiresTick = lifetimeDays > 0 ? tick + daysToTicks(lifetimeDays) : undefined;
      list.push({
        id: `n${world.counters.notifications}`,
        tick,
        severity: message.severity,
        key: message.key,
        vars: message.vars,
        ...(message.link !== undefined ? { link: message.link } : {}),
        read: false,
        ...(expiresTick !== undefined ? { expiresTick } : {}),
      });
    }

    for (const playerId of world.playerOrder) {
      const list = world.notifications[playerId];
      if (list === undefined) {
        continue;
      }
      const kept = list.filter(
        (notification) => notification.expiresTick === undefined || notification.expiresTick > tick,
      );
      if (kept.length !== list.length) {
        world.notifications[playerId] = kept;
      }
    }
  };

  return {
    manifest: {
      id: "notifications",
      cadence: "hourly",
      order: NOTIFICATIONS_SYSTEM_ORDER,
      writes: [],
    },
    tick: flush,
    flush,
  };
}
