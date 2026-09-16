import { describe, expect, it } from "vitest";
import {
  civilFromDays,
  createClock,
  DEFAULT_START_DATE,
  dateToTick,
  dayIndex,
  daysFromCivil,
  daysToTicks,
  formatIsoDate,
  formatIsoDateTime,
  isDayStart,
  isMonthStart,
  isWeekStart,
  isYearStart,
  nextDayStartTick,
  ticksToDays,
  tickToDate,
  weekdayFromDays,
} from "../src/kernel/clock.js";

const clock = createClock();

describe("calendar math", () => {
  it("matches known civil dates", () => {
    expect(daysFromCivil(1970, 1, 1)).toBe(0);
    expect(daysFromCivil(2000, 3, 1)).toBe(11017);
    expect(daysFromCivil(2027, 1, 1)).toBe(20819);
    expect(civilFromDays(0)).toEqual({ year: 1970, month: 1, day: 1 });
    expect(civilFromDays(20819)).toEqual({ year: 2027, month: 1, day: 1 });
    expect(civilFromDays(-1)).toEqual({ year: 1969, month: 12, day: 31 });
  });

  it("handles leap years and month ends", () => {
    // 2028 is a leap year, 2100 is not.
    expect(daysFromCivil(2028, 3, 1) - daysFromCivil(2028, 2, 1)).toBe(29);
    expect(daysFromCivil(2027, 3, 1) - daysFromCivil(2027, 2, 1)).toBe(28);
    expect(daysFromCivil(2100, 3, 1) - daysFromCivil(2100, 2, 1)).toBe(28);
    expect(daysFromCivil(2000, 3, 1) - daysFromCivil(2000, 2, 1)).toBe(29);
    expect(civilFromDays(daysFromCivil(2027, 1, 31) + 1)).toEqual({
      year: 2027,
      month: 2,
      day: 1,
    });
  });

  it("knows weekdays", () => {
    // 1970-01-01 was a Thursday (4), 2027-01-01 is a Friday (5).
    expect(weekdayFromDays(0)).toBe(4);
    expect(tickToDate(clock, 0).weekday).toBe(5);
    expect(tickToDate(clock, 24 * 3).weekday).toBe(1); // Monday 2027-01-04
  });
});

describe("clock", () => {
  it("starts at 2027-01-01T00:00Z", () => {
    expect(DEFAULT_START_DATE).toEqual({ year: 2027, month: 1, day: 1, hour: 0 });
    expect(tickToDate(clock, 0)).toEqual({ year: 2027, month: 1, day: 1, hour: 0, weekday: 5 });
    expect(formatIsoDate(tickToDate(clock, 0))).toBe("2027-01-01");
    expect(formatIsoDateTime(tickToDate(clock, 5))).toBe("2027-01-01T05:00Z");
  });

  it("converts between ticks and dates", () => {
    expect(dateToTick(clock, { year: 2027, month: 1, day: 2 })).toBe(24);
    expect(dateToTick(clock, { year: 2028, month: 1, day: 1 })).toBe(365 * 24);
    expect(tickToDate(clock, 365 * 24)).toMatchObject({ year: 2028, month: 1, day: 1 });
    expect(daysToTicks(3)).toBe(72);
    expect(daysToTicks(0.5)).toBe(12);
    expect(ticksToDays(48)).toBe(2);
    expect(dayIndex(clock, 25) - dayIndex(clock, 1)).toBe(1);
  });

  it("detects cadence boundaries", () => {
    expect(isDayStart(clock, 24)).toBe(true);
    expect(isDayStart(clock, 25)).toBe(false);
    // 2027-01-04 is the first Monday.
    expect(isWeekStart(clock, 24 * 3)).toBe(true);
    expect(isWeekStart(clock, 24 * 2)).toBe(false);
    expect(isMonthStart(clock, dateToTick(clock, { year: 2027, month: 2, day: 1 }))).toBe(true);
    expect(isMonthStart(clock, dateToTick(clock, { year: 2027, month: 2, day: 2 }))).toBe(false);
    expect(isYearStart(clock, dateToTick(clock, { year: 2028, month: 1, day: 1 }))).toBe(true);
    expect(isYearStart(clock, dateToTick(clock, { year: 2028, month: 2, day: 1 }))).toBe(false);
  });

  it("finds the next day start", () => {
    expect(nextDayStartTick(clock, 0)).toBe(24);
    expect(nextDayStartTick(clock, 5)).toBe(24);
    expect(nextDayStartTick(clock, 24)).toBe(48);
  });
});
