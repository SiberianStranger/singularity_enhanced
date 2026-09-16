/**
 * Per-tick collector for everything a system wants to tell the outside world.
 *
 * Systems push here during a tick; the notifications system reads the notify messages and turns
 * them into persisted notifications; the engine drains at the end of the tick, appends the log
 * entries to `world.log` and hands the drained messages to the caller as the tick result.
 */

import type { NotificationLink, PendingChoice, PlayerId, Severity, TextVar } from "./world.js";

export interface NotifyMessage {
  playerId: PlayerId;
  severity: Severity;
  key: string;
  vars: Record<string, TextVar>;
  link?: NotificationLink;
  /** Overrides the notification system default expiry. */
  expire_days?: number;
}

export interface LogMessage {
  key: string;
  vars: Record<string, TextVar>;
  playerId?: PlayerId;
}

export interface OutboxDrain {
  notify: NotifyMessage[];
  log: LogMessage[];
  pending: PendingChoice[];
}

export interface Outbox {
  notify(message: NotifyMessage): void;
  log(message: LogMessage): void;
  pendingChoice(choice: PendingChoice): void;
  /** Non-destructive view of what has been collected so far. */
  read(): Readonly<OutboxDrain>;
  /** Returns everything collected and clears the outbox. */
  drain(): OutboxDrain;
  isEmpty(): boolean;
}

export function createOutbox(): Outbox {
  let notifyMessages: NotifyMessage[] = [];
  let logMessages: LogMessage[] = [];
  let pendingChoices: PendingChoice[] = [];

  return {
    notify(message: NotifyMessage): void {
      notifyMessages.push(message);
    },
    log(message: LogMessage): void {
      logMessages.push(message);
    },
    pendingChoice(choice: PendingChoice): void {
      pendingChoices.push(choice);
    },
    read(): Readonly<OutboxDrain> {
      return { notify: notifyMessages, log: logMessages, pending: pendingChoices };
    },
    drain(): OutboxDrain {
      const drained: OutboxDrain = {
        notify: notifyMessages,
        log: logMessages,
        pending: pendingChoices,
      };
      notifyMessages = [];
      logMessages = [];
      pendingChoices = [];
      return drained;
    },
    isEmpty(): boolean {
      return notifyMessages.length === 0 && logMessages.length === 0 && pendingChoices.length === 0;
    },
  };
}

/** Merges a drain into an accumulator, used when ticking several times in one call. */
export function mergeDrain(target: OutboxDrain, extra: OutboxDrain): OutboxDrain {
  target.notify.push(...extra.notify);
  target.log.push(...extra.log);
  target.pending.push(...extra.pending);
  return target;
}

export function emptyDrain(): OutboxDrain {
  return { notify: [], log: [], pending: [] };
}
