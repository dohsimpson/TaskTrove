import { describe, it, expect } from "vitest";
import {
  addDays,
  startOfDay,
  nextMonday,
  nextTuesday,
  nextWednesday,
  nextThursday,
  nextFriday,
  nextSaturday,
  nextSunday,
} from "date-fns";
import { WeekdayExtractor } from "../../../src/extractors/date/WeekdayExtractor";
import type { ParserContext } from "../../../src/types";

describe("WeekdayExtractor", () => {
  const extractor = new WeekdayExtractor();

  // Helper to get specific weekday dates
  const getNextWeekday = (referenceDate: Date, weekday: number) => {
    const daysUntilWeekday = (weekday - referenceDate.getDay() + 7) % 7;
    const daysToAdd = daysUntilWeekday === 0 ? 7 : daysUntilWeekday; // If today, use next week
    return startOfDay(addDays(referenceDate, daysToAdd));
  };

  // Test with Wednesday reference (2025-01-15 was a Wednesday)
  const referenceDate = new Date(2025, 0, 15);
  const context: ParserContext = {
    locale: "en",
    referenceDate,
  };

  it('should extract "monday"', () => {
    const results = extractor.extract("Meeting monday", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.type).toBe("date");
    expect(results[0]?.value).toEqual(getNextWeekday(referenceDate, 1));
  });

  it('should extract "tuesday"', () => {
    const results = extractor.extract("Call tuesday", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toEqual(getNextWeekday(referenceDate, 2));
  });

  it('should extract "wednesday"', () => {
    const results = extractor.extract("Review wednesday", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toEqual(getNextWeekday(referenceDate, 3));
  });

  it('should extract "thursday"', () => {
    const results = extractor.extract("Presentation thursday", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toEqual(getNextWeekday(referenceDate, 4));
  });

  it('should extract "friday"', () => {
    const results = extractor.extract("Deadline friday", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toEqual(getNextWeekday(referenceDate, 5));
  });

  it('should extract "saturday"', () => {
    const results = extractor.extract("Party saturday", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toEqual(getNextWeekday(referenceDate, 6));
  });

  it('should extract "sunday"', () => {
    const results = extractor.extract("Brunch sunday", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toEqual(getNextWeekday(referenceDate, 0));
  });

  it('should extract "this friday"', () => {
    const results = extractor.extract("Task this friday", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toEqual(getNextWeekday(referenceDate, 5));
  });

  it('should extract "next tuesday"', () => {
    const results = extractor.extract("Review next tuesday", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toEqual(getNextWeekday(referenceDate, 2));
  });

  it("should extract shorthand weekday names", () => {
    const monResults = extractor.extract("Call mon", context);
    const tueResults = extractor.extract("Meeting tue", context);
    const satResults = extractor.extract("Workshop sat", context);
    const sunResults = extractor.extract("Game sun", context);

    expect(monResults).toHaveLength(1);
    expect(monResults[0]?.value).toEqual(getNextWeekday(referenceDate, 1));

    expect(tueResults).toHaveLength(1);
    expect(tueResults[0]?.value).toEqual(getNextWeekday(referenceDate, 2));

    expect(satResults).toHaveLength(1);
    expect(satResults[0]?.value).toEqual(getNextWeekday(referenceDate, 6));

    expect(sunResults).toHaveLength(1);
    expect(sunResults[0]?.value).toEqual(getNextWeekday(referenceDate, 0));
  });

  it("should not match weekdays attached to other words", () => {
    const results = extractor.extract("planningsunday ride", context);

    expect(results).toHaveLength(0);
  });

  it("should match weekdays followed by punctuation", () => {
    const results = extractor.extract("Plan monday, review", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.match).toBe("monday");
  });

  it("should return empty when no weekday found", () => {
    const results = extractor.extract("Just a task", context);

    expect(results).toEqual([]);
  });
});
