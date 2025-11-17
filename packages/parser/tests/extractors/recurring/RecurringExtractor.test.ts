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

  it("should not match recurring keywords attached to other words", () => {
    const results = extractor.extract("reminderdaily", context);

    expect(results).toHaveLength(0);
  });

  it("should still match recurring keywords next to punctuation", () => {
    const results = extractor.extract("Schedule daily, review", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.match).toBe("daily");
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

  it('should extract "every weekend" as saturday/sunday weekly rule', () => {
    const results = extractor.extract("Chores every weekend", context);

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      type: "recurring",
      value: "RRULE:FREQ=WEEKLY;BYDAY=SA,SU",
    });
  });

  it('should extract abbreviated "ev weekday"', () => {
    const results = extractor.extract("Emails ev weekday", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toBe("RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR");
  });

  it('should support weekday ranges like "every mon-fri"', () => {
    const results = extractor.extract("Gym every mon-fri", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toBe("RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR");
  });

  it('should parse repeated abbreviations like "ev mon, ev fri"', () => {
    const results = extractor.extract("Sync ev mon, ev fri", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toBe("RRULE:FREQ=WEEKLY;BYDAY=MO,FR");
  });

  it('should extract "every other month" as interval 2 monthly', () => {
    const results = extractor.extract(
      "Budget review every other month",
      context,
    );

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toBe("RRULE:FREQ=MONTHLY;INTERVAL=2");
  });

  it('should extract "every other year" as interval 2 yearly', () => {
    const results = extractor.extract("Conference every other year", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toBe("RRULE:FREQ=YEARLY;INTERVAL=2");
  });

  it('should accept abbreviated ordinal like "ev 2nd Monday"', () => {
    const results = extractor.extract("Payroll ev 2nd Monday", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toBe("RRULE:FREQ=MONTHLY;BYDAY=2MO");
  });

  it('should treat "ev 3 days" as an interval rule, not day-of-month', () => {
    const results = extractor.extract("Status ev 3 days", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toBe("RRULE:FREQ=DAILY;INTERVAL=3");
  });

  it('should translate "every first workday" to BYSETPOS=1 weekdays', () => {
    const results = extractor.extract("Invoices every first workday", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toBe(
      "RRULE:FREQ=MONTHLY;BYDAY=MO,TU,WE,TH,FR;BYSETPOS=1",
    );
  });

  it('should translate "every last workday" to BYSETPOS=-1 weekdays', () => {
    const results = extractor.extract("Payroll every last workday", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toBe(
      "RRULE:FREQ=MONTHLY;BYDAY=MO,TU,WE,TH,FR;BYSETPOS=-1",
    );
  });

  it('should support multi-day monthly lists like "every 2, every 15, every 27"', () => {
    const results = extractor.extract(
      "Review every 2, every 15, every 27",
      context,
    );

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toBe("RRULE:FREQ=MONTHLY;BYMONTHDAY=2,15,27");
  });

  it('should treat "every 27" as monthly day', () => {
    const results = extractor.extract("Report every 27", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toBe("RRULE:FREQ=MONTHLY;BYMONTHDAY=27");
  });

  it('should treat "every 3 workday" as weekday interval', () => {
    const results = extractor.extract("Checklist every 3 workday", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toBe(
      "RRULE:FREQ=DAILY;INTERVAL=3;BYDAY=MO,TU,WE,TH,FR",
    );
  });

  it('should support specific month-day list like "every 14 jan, 14 apr, 15 jun, 15 sep"', () => {
    const results = extractor.extract(
      "Comms every 14 jan, 14 apr, 15 jun, 15 sep",
      context,
    );

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toBe(
      [
        "RRULE:FREQ=YEARLY;BYMONTH=1;BYMONTHDAY=14",
        "RRULE:FREQ=YEARLY;BYMONTH=4;BYMONTHDAY=14",
        "RRULE:FREQ=YEARLY;BYMONTH=6;BYMONTHDAY=15",
        "RRULE:FREQ=YEARLY;BYMONTH=9;BYMONTHDAY=15",
      ].join("\n"),
    );
  });

  it('should include month for ordinal like "ev 3rd friday jan"', () => {
    const results = extractor.extract("Plan ev 3rd friday jan", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toBe("RRULE:FREQ=YEARLY;BYDAY=3FR;BYMONTH=1");
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

  // Phase 1: Hourly patterns - should return only recurring pattern
  it('should extract "every hour" as recurring only', () => {
    const referenceDate = new Date(2025, 0, 15, 10, 30, 0); // Jan 15, 2025 10:30 AM
    const context: ParserContext = {
      locale: "en",
      referenceDate,
    };

    const results = extractor.extract("Check status every hour", context);

    // Should return only 1 result: recurring pattern
    expect(results).toHaveLength(1);

    // Check the recurring pattern result
    expect(results[0]).toMatchObject({
      type: "recurring",
      value: "RRULE:FREQ=HOURLY",
      match: "every hour",
    });
  });

  it('should extract "every 12 hours" with interval as recurring only', () => {
    const referenceDate = new Date(2025, 0, 15, 10, 30, 0); // Jan 15, 2025 10:30 AM
    const context: ParserContext = {
      locale: "en",
      referenceDate,
    };

    const results = extractor.extract("Medication every 12 hours", context);

    // Should return only 1 result: recurring pattern
    expect(results).toHaveLength(1);

    // Check the recurring pattern result
    expect(results[0]).toMatchObject({
      type: "recurring",
      value: "RRULE:FREQ=HOURLY;INTERVAL=12",
      match: "every 12 hours",
    });
  });

  // Phase 1: Time-of-day patterns - should return only recurring pattern
  it('should extract "every morning" as recurring only', () => {
    const results = extractor.extract("Exercise every morning", context);

    expect(results).toHaveLength(1);

    // Check the recurring pattern result
    expect(results[0]).toMatchObject({
      type: "recurring",
      value: "RRULE:FREQ=DAILY",
      match: "every morning",
    });
  });

  it('should extract "every afternoon" as recurring only', () => {
    const results = extractor.extract("Lunch break every afternoon", context);

    expect(results).toHaveLength(1);

    expect(results[0]).toMatchObject({
      type: "recurring",
      value: "RRULE:FREQ=DAILY",
      match: "every afternoon",
    });
  });

  it('should extract "every evening" as recurring only', () => {
    const results = extractor.extract("Team meeting every evening", context);

    expect(results).toHaveLength(1);

    expect(results[0]).toMatchObject({
      type: "recurring",
      value: "RRULE:FREQ=DAILY",
      match: "every evening",
    });
  });

  it('should extract "every night" as recurring only', () => {
    const results = extractor.extract("Review every night", context);

    expect(results).toHaveLength(1);

    expect(results[0]).toMatchObject({
      type: "recurring",
      value: "RRULE:FREQ=DAILY",
      match: "every night",
    });
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

  // Phase 3.1: Ordinal Weekday Patterns
  it('should extract "every 2nd Monday" as ordinal weekday pattern', () => {
    const results = extractor.extract("Team review every 2nd Monday", context);

    expect(results).toHaveLength(1);

    const recurringResult = results.find((r) => r.type === "recurring");
    expect(recurringResult).toMatchObject({
      type: "recurring",
      value: "RRULE:FREQ=MONTHLY;BYDAY=2MO",
      match: "every 2nd Monday",
    });
  });

  it('should extract "every 3rd friday" with lowercase', () => {
    const results = extractor.extract("Cleanup every 3rd friday", context);

    // Should only have 1 result - the ordinal weekday pattern
    // The negative lookahead prevents "every 3rd" from matching when followed by a weekday
    expect(results).toHaveLength(1);

    const recurringResult = results.find((r) => r.type === "recurring");
    expect(recurringResult).toMatchObject({
      type: "recurring",
      value: "RRULE:FREQ=MONTHLY;BYDAY=3FR",
      match: "every 3rd friday",
    });
  });

  it('should extract "every 1st Tuesday"', () => {
    const results = extractor.extract(
      "Board meeting every 1st Tuesday",
      context,
    );

    expect(results).toHaveLength(1);

    const recurringResult = results.find((r) => r.type === "recurring");
    expect(recurringResult).toMatchObject({
      type: "recurring",
      value: "RRULE:FREQ=MONTHLY;BYDAY=1TU",
      match: "every 1st Tuesday",
    });
  });

  it('should extract "every 4th Wednesday"', () => {
    const results = extractor.extract("Report every 4th Wednesday", context);

    expect(results).toHaveLength(1);

    const recurringResult = results.find((r) => r.type === "recurring");
    expect(recurringResult).toMatchObject({
      type: "recurring",
      value: "RRULE:FREQ=MONTHLY;BYDAY=4WE",
      match: "every 4th Wednesday",
    });
  });

  // Phase 3.2: Ordinal + Time Combination - now handled by Phase 3.3 patterns
  // These tests verify that ordinal weekday + time patterns are extracted as single RRULE with BYHOUR
  it('should extract "every 3rd friday 8pm" with time combined', () => {
    const results = extractor.extract(
      "Team happy hour every 3rd friday 8pm",
      context,
    );

    // Should extract recurring pattern with time included in RRULE
    expect(results.length).toBeGreaterThanOrEqual(1);

    const recurringResult = results.find((r) => r.type === "recurring");
    expect(recurringResult).toMatchObject({
      type: "recurring",
      value: "RRULE:FREQ=MONTHLY;BYDAY=3FR;BYHOUR=20",
      match: "every 3rd friday 8pm",
    });
  });

  it('should extract "every 2nd Monday at 9am" with time combined', () => {
    const results = extractor.extract(
      "Standup every 2nd Monday at 9am",
      context,
    );

    expect(results.length).toBeGreaterThanOrEqual(1);

    const recurringResult = results.find((r) => r.type === "recurring");
    expect(recurringResult).toMatchObject({
      type: "recurring",
      value: "RRULE:FREQ=MONTHLY;BYDAY=2MO;BYHOUR=9",
      match: "every 2nd Monday at 9am",
    });
  });

  // Phase 3.3: Time + Recurrence Combinations for multi-day patterns
  it('should extract "ev mon, fri at 20:00" combining multi-day with time', () => {
    const results = extractor.extract(
      "Team sync ev mon, fri at 20:00",
      context,
    );

    // Should extract recurring pattern with time
    expect(results.length).toBeGreaterThanOrEqual(1);

    const recurringResult = results.find((r) => r.type === "recurring");
    expect(recurringResult).toMatchObject({
      type: "recurring",
      value: "RRULE:FREQ=WEEKLY;BYDAY=MO,FR;BYHOUR=20",
      match: "ev mon, fri at 20:00",
    });

    // Note: Time extraction is handled separately by TimeExtractor
    // The recurring pattern should include BYHOUR parameter
  });

  // Phase 3.4: Last Position Patterns
  describe("Last position patterns", () => {
    it('should extract "ev last day" as last day of month', () => {
      const results = extractor.extract("Pay bills ev last day", context);

      expect(results).toHaveLength(1);

      const recurringResult = results.find((r) => r.type === "recurring");
      expect(recurringResult).toMatchObject({
        type: "recurring",
        value: "RRULE:FREQ=MONTHLY;BYMONTHDAY=-1",
        match: "ev last day",
      });
    });

    it('should extract "every last day" as last day of month', () => {
      const results = extractor.extract(
        "Review every last day of the month",
        context,
      );

      expect(results).toHaveLength(1);

      const recurringResult = results.find((r) => r.type === "recurring");
      expect(recurringResult).toMatchObject({
        type: "recurring",
        value: "RRULE:FREQ=MONTHLY;BYMONTHDAY=-1",
        match: "every last day",
      });
    });

    it('should extract "ev last mon" as last Monday of month', () => {
      const results = extractor.extract("Team meeting ev last mon", context);

      expect(results).toHaveLength(1);

      const recurringResult = results.find((r) => r.type === "recurring");
      expect(recurringResult).toMatchObject({
        type: "recurring",
        value: "RRULE:FREQ=MONTHLY;BYDAY=-1MO",
        match: "ev last mon",
      });
    });

    it('should extract "every last friday" as last Friday of month', () => {
      const results = extractor.extract(
        "Happy hour every last friday",
        context,
      );

      expect(results).toHaveLength(1);

      const recurringResult = results.find((r) => r.type === "recurring");
      expect(recurringResult).toMatchObject({
        type: "recurring",
        value: "RRULE:FREQ=MONTHLY;BYDAY=-1FR",
        match: "every last friday",
      });
    });
  });

  // Phase 3.4: Skip Logic (Every Other)
  describe("Skip logic patterns", () => {
    it('should extract "every other friday" with interval', () => {
      const results = extractor.extract(
        "Pizza party every other friday",
        context,
      );

      expect(results).toHaveLength(1);

      const recurringResult = results.find((r) => r.type === "recurring");
      expect(recurringResult).toMatchObject({
        type: "recurring",
        value: "RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=FR",
        match: "every other friday",
      });
    });

    it('should extract "every other monday" with interval', () => {
      const results = extractor.extract("Standup every other monday", context);

      expect(results).toHaveLength(1);

      const recurringResult = results.find((r) => r.type === "recurring");
      expect(recurringResult).toMatchObject({
        type: "recurring",
        value: "RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=MO",
        match: "every other monday",
      });
    });

    it('should extract "every other day" as interval 2 daily', () => {
      const results = extractor.extract("Exercise every other day", context);

      expect(results).toHaveLength(1);

      const recurringResult = results.find((r) => r.type === "recurring");
      expect(recurringResult).toMatchObject({
        type: "recurring",
        value: "RRULE:FREQ=DAILY;INTERVAL=2",
        match: "every other day",
      });
    });

    it('should extract "every other week" as interval 2 weekly', () => {
      const results = extractor.extract("Report every other week", context);

      expect(results).toHaveLength(1);

      const recurringResult = results.find((r) => r.type === "recurring");
      expect(recurringResult).toMatchObject({
        type: "recurring",
        value: "RRULE:FREQ=WEEKLY;INTERVAL=2",
        match: "every other week",
      });
    });
  });
  it('should capture each clause in "every 1st wed jan, every 3rd thu jul"', () => {
    const results = extractor.extract(
      "every 1st wed jan, every 3rd thu jul",
      context,
    );

    expect(results).toHaveLength(2);
    expect(results[0]?.value).toBe("RRULE:FREQ=YEARLY;BYDAY=1WE;BYMONTH=1");
    expect(results[1]?.value).toBe("RRULE:FREQ=YEARLY;BYDAY=3TH;BYMONTH=7");
  });
});
