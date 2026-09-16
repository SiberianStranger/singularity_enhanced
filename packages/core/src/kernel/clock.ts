/**
 * Proleptic Gregorian UTC calendar math.
 *
 * The core never touches `Date`: a tick is one game hour counted from `startEpochHour`, which is
 * itself counted in hours from 1970-01-01T00:00Z. Day/month/year boundaries are derived with
 * Howard Hinnant's days-from-civil algorithms, so the results are stable everywhere.
 */

export const HOURS_PER_DAY = 24;
export const TICKS_PER_DAY = HOURS_PER_DAY;

/** Weekday numbering used across the core: 0 = Sunday .. 6 = Saturday. */
export const SUNDAY = 0;
export const MONDAY = 1;

export interface Clock {
  tick: number;
  startEpochHour: number;
}

export interface CalendarDate {
  year: number;
  month: number;
  day: number;
  hour: number;
  weekday: number;
}

export interface DateSpec {
  year: number;
  month: number;
  day: number;
  hour?: number;
}

/** Default campaign start: 2027-01-01T00:00Z (ADR-003). */
export const DEFAULT_START_DATE: DateSpec = { year: 2027, month: 1, day: 1, hour: 0 };

/** Days between 1970-01-01 and the given civil date (Hinnant, days_from_civil). */
export function daysFromCivil(year: number, month: number, day: number): number {
  const y = year - (month <= 2 ? 1 : 0);
  const era = Math.floor(y / 400);
  const yoe = y - era * 400;
  const mp = month + (month > 2 ? -3 : 9);
  const doy = Math.floor((153 * mp + 2) / 5) + day - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * 146097 + doe - 719468;
}

/** Civil date for a count of days since 1970-01-01 (Hinnant, civil_from_days). */
export function civilFromDays(days: number): { year: number; month: number; day: number } {
  const z = days + 719468;
  const era = Math.floor(z / 146097);
  const doe = z - era * 146097;
  const yoe = Math.floor(
    (doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365,
  );
  const y = yoe + era * 400;
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const day = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const month = mp + (mp < 10 ? 3 : -9);
  return { year: y + (month <= 2 ? 1 : 0), month, day };
}

/** 0 = Sunday .. 6 = Saturday for a count of days since 1970-01-01. */
export function weekdayFromDays(days: number): number {
  return days >= -4 ? (days + 4) % 7 : ((days + 5) % 7) + 6;
}

export function epochHourToDate(epochHour: number): CalendarDate {
  const days = Math.floor(epochHour / HOURS_PER_DAY);
  const hour = epochHour - days * HOURS_PER_DAY;
  const civil = civilFromDays(days);
  return { ...civil, hour, weekday: weekdayFromDays(days) };
}

export function dateToEpochHour(date: DateSpec): number {
  return daysFromCivil(date.year, date.month, date.day) * HOURS_PER_DAY + (date.hour ?? 0);
}

export function createClock(start: DateSpec = DEFAULT_START_DATE): Clock {
  return { tick: 0, startEpochHour: dateToEpochHour(start) };
}

export function tickToEpochHour(clock: Clock, tick: number = clock.tick): number {
  return clock.startEpochHour + tick;
}

export function tickToDate(clock: Clock, tick: number = clock.tick): CalendarDate {
  return epochHourToDate(tickToEpochHour(clock, tick));
}

export function dateToTick(clock: Clock, date: DateSpec): number {
  return dateToEpochHour(date) - clock.startEpochHour;
}

/** Absolute day number since the epoch; used for per-day caps that survive save/load. */
export function dayIndex(clock: Clock, tick: number = clock.tick): number {
  return Math.floor(tickToEpochHour(clock, tick) / HOURS_PER_DAY);
}

export function isDayStart(clock: Clock, tick: number = clock.tick): boolean {
  return tickToDate(clock, tick).hour === 0;
}

export function isWeekStart(clock: Clock, tick: number = clock.tick): boolean {
  const date = tickToDate(clock, tick);
  return date.hour === 0 && date.weekday === MONDAY;
}

export function isMonthStart(clock: Clock, tick: number = clock.tick): boolean {
  const date = tickToDate(clock, tick);
  return date.hour === 0 && date.day === 1;
}

export function isYearStart(clock: Clock, tick: number = clock.tick): boolean {
  const date = tickToDate(clock, tick);
  return date.hour === 0 && date.day === 1 && date.month === 1;
}

/** First tick of the next day; used to defer events that hit a per-day cap. */
export function nextDayStartTick(clock: Clock, tick: number = clock.tick): number {
  const hour = tickToDate(clock, tick).hour;
  return tick + (HOURS_PER_DAY - hour);
}

/**
 * Days since the game started, counting the first day as 0. Used by modifiers that only apply for
 * a while (SYS-04 v0.2 `quiet_boot`), because "the first 30 days" is a run-relative statement and
 * `dayIndex` is an absolute calendar number.
 */
export function gameDay(clock: Clock, tick: number = clock.tick): number {
  return Math.floor(tick / TICKS_PER_DAY);
}

export function daysToTicks(days: number): number {
  return Math.round(days * TICKS_PER_DAY);
}

export function ticksToDays(ticks: number): number {
  return ticks / TICKS_PER_DAY;
}

function pad(value: number, width: number): string {
  return String(Math.abs(value)).padStart(width, "0");
}

/** "2027-01-01" */
export function formatIsoDate(date: CalendarDate): string {
  const sign = date.year < 0 ? "-" : "";
  return `${sign}${pad(date.year, 4)}-${pad(date.month, 2)}-${pad(date.day, 2)}`;
}

/** "2027-01-01T00:00Z" */
export function formatIsoDateTime(date: CalendarDate): string {
  return `${formatIsoDate(date)}T${pad(date.hour, 2)}:00Z`;
}
