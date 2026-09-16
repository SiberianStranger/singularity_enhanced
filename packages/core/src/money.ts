/**
 * Player cash with a fractional carry (SYS-07).
 *
 * The original game kept an integer `cash` and a separate `partial_cash` so a trickle of income
 * never rounded away to nothing. The same trick here: `player.cash` is always whole dollars and
 * everything below a dollar waits in `player.vars.cash_carry`.
 */

import { VAR_CASH_CARRY } from "./balance.js";
import type { PlayerState } from "./kernel/world.js";

function carryOf(player: PlayerState): number {
  const carry = player.vars[VAR_CASH_CARRY] ?? 0;
  return Number.isFinite(carry) ? carry : 0;
}

function store(player: PlayerState, balance: number): void {
  const whole = Math.floor(balance);
  player.cash = whole;
  player.vars[VAR_CASH_CARRY] = balance - whole;
}

/** Everything the player can spend right now, including the sub-dollar carry. */
export function playerBalance(player: PlayerState): number {
  return player.cash + carryOf(player);
}

export function creditPlayer(player: PlayerState, amount: number): void {
  if (!Number.isFinite(amount) || amount <= 0) {
    return;
  }
  store(player, playerBalance(player) + amount);
}

/** Pays as much of `amount` as the player can afford and returns what was actually paid. */
export function payFromPlayer(player: PlayerState, amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) {
    return 0;
  }
  const balance = playerBalance(player);
  const paid = Math.min(amount, Math.max(0, balance));
  store(player, balance - paid);
  return paid;
}

export function canAfford(player: PlayerState, amount: number): boolean {
  return playerBalance(player) >= amount;
}
