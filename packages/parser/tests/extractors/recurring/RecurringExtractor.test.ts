import { describe, it, expect } from "vitest";
import { RecurringExtractor } from "../../../src/extractors/recurring/RecurringExtractor";
import type { ParserContext } from "../../../src/types";
import { MULTI_DAY_PATTERNS } from "../../../src/extractors/recurring/RecurringExtractor";

describe("RecurringExtractor", () => {
  const extractor = new RecurringExtractor();
  const context: ParserContext = {
    locale: "en",
    referenceDate: new Date(),
  };

  it('should extract "every day"', () => {
    const results = extractor.extract("Exercise every day", context);

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      type: "recurring",
      value: "RRULE:FREQ=DAILY",
      match: "every day",
    });
  });

  it('should extract "daily"', () => {
    const results = extractor.extract("Meeting daily", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toBe("RRULE:FREQ=DAILY");
  });

  it('should extract "every week"', () => {
    const results = extractor.extract("Review every week", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toBe("RRULE:FREQ=WEEKLY");
  });

  it('should extract "weekly"', () => {
    const results = extractor.extract("Report weekly", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toBe("RRULE:FREQ=WEEKLY");
  });

  it('should extract "every monday"', () => {
    const results = extractor.extract("Team sync every monday", context);

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      type: "recurring",
      value: "RRULE:FREQ=WEEKLY;BYDAY=MO",
      match: "every monday",
    });
  });

  it('should extract "every month"', () => {
    const results = extractor.extract("Pay bills every month", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toBe("RRULE:FREQ=MONTHLY");
  });

  it('should extract "monthly"', () => {
    const results = extractor.extract("Newsletter monthly", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toBe("RRULE:FREQ=MONTHLY");
  });

  it('should extract "every year"', () => {
    const results = extractor.extract("Birthday every year", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toBe("RRULE:FREQ=YEARLY");
  });

  it('should extract "yearly"', () => {
    const results = extractor.extract("Checkup yearly", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toBe("RRULE:FREQ=YEARLY");
  });

  it('should extract "every 3 days"', () => {
    const results = extractor.extract("Backup every 3 days", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toBe("RRULE:FREQ=DAILY;INTERVAL=3");
  });

  it('should extract "every 2 weeks"', () => {
    const results = extractor.extract("Sprint every 2 weeks", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toBe("RRULE:FREQ=WEEKLY;INTERVAL=2");
  });

  it("should return empty array when no recurring pattern found", () => {
    const results = extractor.extract("Just a task", context);

    expect(results).toEqual([]);
  });

  it("should respect disabled sections", () => {
    const context: ParserContext = {
      locale: "en",
      referenceDate: new Date(),
      disabledSections: new Set(["daily"]),
    };

    const results = extractor.extract("Meeting daily", context);

    expect(results).toEqual([]);
  });

  // Phase 1: Hourly patterns - these should return enhanced recurring info with time calculations
  it('should extract "every hour" and calculate next hour start time', () => {
    const referenceDate = new Date(2025, 0, 15, 10, 30, 0); // Jan 15, 2025 10:30 AM
    const context: ParserContext = {
      locale: "en",
      referenceDate,
    };

    const results = extractor.extract("Check status every hour", context);

    // Should return 3 results: recurring + date + time
    expect(results).toHaveLength(3);

    // Check the recurring pattern result
    const recurringResult = results.find((r) => r.type === "recurring");
    expect(recurringResult).toMatchObject({
      type: "recurring",
      value: "RRULE:FREQ=HOURLY",
      match: "every hour",
    });

    // Check the date result (next hour start)
    const dateResult = results.find((r) => r.type === "date");
    expect(dateResult).toBeDefined();
    expect(dateResult?.value).toEqual(new Date(2025, 0, 15, 11, 0, 0)); // 11:00 AM

    // Check the time result (next hour time)
    const timeResult = results.find((r) => r.type === "time");
    expect(timeResult).toBeDefined();
    expect(timeResult?.value).toBe("11:00");
  });

  it('should extract "every 12 hours" with interval', () => {
    const referenceDate = new Date(2025, 0, 15, 10, 30, 0); // Jan 15, 2025 10:30 AM
    const context: ParserContext = {
      locale: "en",
      referenceDate,
    };

    const results = extractor.extract("Medication every 12 hours", context);

    // Should return 3 results: recurring + date + time
    expect(results).toHaveLength(3);

    // Check the recurring pattern result
    const recurringResult = results.find((r) => r.type === "recurring");
    expect(recurringResult).toMatchObject({
      type: "recurring",
      value: "RRULE:FREQ=HOURLY;INTERVAL=12",
      match: "every 12 hours",
    });

    // Check that time and date results are generated
    const dateResult = results.find((r) => r.type === "date");
    const timeResult = results.find((r) => r.type === "time");
    expect(dateResult).toBeDefined();
    expect(timeResult).toBeDefined();
  });

  // Phase 1: Time-of-day patterns - should extract daily patterns with default times
  it('should extract "every morning" as daily at 9am', () => {
    const results = extractor.extract("Exercise every morning", context);

    expect(results).toHaveLength(2);

    // Check the recurring pattern result
    const recurringResult = results.find((r) => r.type === "recurring");
    expect(recurringResult).toMatchObject({
      type: "recurring",
      value: "RRULE:FREQ=DAILY",
      match: "every morning",
    });

    // Check the time result (9am default)
    const timeResult = results.find((r) => r.type === "time");
    expect(timeResult).toBeDefined();
    expect(timeResult?.value).toBe("09:00");
  });

  it('should extract "every afternoon" as daily at 12pm', () => {
    const results = extractor.extract("Lunch break every afternoon", context);

    expect(results).toHaveLength(2);

    const recurringResult = results.find((r) => r.type === "recurring");
    expect(recurringResult?.match).toBe("every afternoon");

    const timeResult = results.find((r) => r.type === "time");
    expect(timeResult?.value).toBe("12:00");
  });

  it('should extract "every evening" as daily at 7pm', () => {
    const results = extractor.extract("Team meeting every evening", context);

    expect(results).toHaveLength(2);

    const recurringResult = results.find((r) => r.type === "recurring");
    expect(recurringResult?.match).toBe("every evening");

    const timeResult = results.find((r) => r.type === "time");
    expect(timeResult?.value).toBe("19:00");
  });

  it('should extract "every night" as daily at 10pm', () => {
    const results = extractor.extract("Review every night", context);

    expect(results).toHaveLength(2);

    const recurringResult = results.find((r) => r.type === "recurring");
    expect(recurringResult?.match).toBe("every night");

    const timeResult = results.find((r) => r.type === "time");
    expect(timeResult?.value).toBe("22:00");
  });

  // Phase 1: Quarterly pattern support
  it('should extract "every quarter" as every 3 months', () => {
    const results = extractor.extract(
      "Financial review every quarter",
      context,
    );

    expect(results).toHaveLength(1);

    const recurringResult = results.find((r) => r.type === "recurring");
    expect(recurringResult).toMatchObject({
      type: "recurring",
      value: "RRULE:FREQ=MONTHLY;INTERVAL=3",
      match: "every quarter",
    });
  });

  it('should extract "quarterly" as every 3 months', () => {
    const results = extractor.extract("Report quarterly", context);

    expect(results).toHaveLength(1);

    const recurringResult = results.find((r) => r.type === "recurring");
    expect(recurringResult).toMatchObject({
      type: "recurring",
      value: "RRULE:FREQ=MONTHLY;INTERVAL=3",
      match: "quarterly",
    });
  });

  // Phase 1: Multi-day list patterns
  it('should extract "every monday, friday" as multiple weekdays', () => {
    const results = extractor.extract(
      "Team meetings every monday, friday",
      context,
    );

    expect(results).toHaveLength(1);

    const recurringResult = results.find((r) => r.type === "recurring");

    expect(recurringResult).toMatchObject({
      type: "recurring",
      value: "RRULE:FREQ=WEEKLY;BYDAY=MO,FR",
      match: "every monday, friday",
    });
  });

  it('should extract "every mon, fri" with abbreviations', () => {
    const results = extractor.extract("Sync every mon, fri", context);

    expect(results).toHaveLength(1);

    const recurringResult = results.find((r) => r.type === "recurring");
    expect(recurringResult).toMatchObject({
      type: "recurring",
      value: "RRULE:FREQ=WEEKLY;BYDAY=MO,FR",
      match: "every mon, fri",
    });
  });

  it('should extract "ev mon, fri" with ev abbreviation', () => {
    const results = extractor.extract("Quick check ev mon, fri", context);

    expect(results).toHaveLength(1);

    const recurringResult = results.find((r) => r.type === "recurring");
    expect(recurringResult).toMatchObject({
      type: "recurring",
      value: "RRULE:FREQ=WEEKLY;BYDAY=MO,FR",
      match: "ev mon, fri",
    });
  });

  it('should handle three day lists like "every monday, wednesday, friday"', () => {
    const results = extractor.extract(
      "Gym every monday, wednesday, friday",
      context,
    );

    expect(results).toHaveLength(1);

    const recurringResult = results.find((r) => r.type === "recurring");
    expect(recurringResult).toMatchObject({
      type: "recurring",
      value: "RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR",
      match: "every monday, wednesday, friday",
    });
  });
});
