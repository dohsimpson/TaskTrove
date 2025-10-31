import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  parseRRule,
  dateMatchesRecurringPattern,
  calculateNextDueDate,
  generateNextTaskInstance,
  shouldGenerateNextInstance,
  processRecurringTaskCompletion,
} from "./recurring-task-processor";
import type { Task, TaskPriority } from "@tasktrove/types/core";
import {
  createTaskId,
  createProjectId,
  createLabelId,
  createSubtaskId,
} from "@tasktrove/types/id";

// Mock UUID generation for consistent testing
vi.mock("uuid", () => ({
  v4: vi.fn(() => "550e8400-e29b-41d4-a716-446655440000"),
}));

// Mock Date to use UTC methods for timezone-independent tests
const OriginalDate = global.Date;
const OriginalDateNow = global.Date.now;

beforeEach(() => {
  // @ts-expect-error - Mocking global Date for tests
  global.Date = class extends OriginalDate {
    // Override local methods to use UTC
    getFullYear() {
      return super.getUTCFullYear();
    }
    getMonth() {
      return super.getUTCMonth();
    }
    getDate() {
      return super.getUTCDate();
    }
    getDay() {
      return super.getUTCDay();
    }
    getHours() {
      return super.getUTCHours();
    }
    getMinutes() {
      return super.getUTCMinutes();
    }
    getSeconds() {
      return super.getUTCSeconds();
    }
    getMilliseconds() {
      return super.getUTCMilliseconds();
    }

    setFullYear(...args: Parameters<Date["setFullYear"]>) {
      return super.setUTCFullYear(...args);
    }
    setMonth(...args: Parameters<Date["setMonth"]>) {
      return super.setUTCMonth(...args);
    }
    setDate(date: number) {
      return super.setUTCDate(date);
    }
    setHours(...args: Parameters<Date["setHours"]>) {
      return super.setUTCHours(...args);
    }
    setMinutes(...args: Parameters<Date["setMinutes"]>) {
      return super.setUTCMinutes(...args);
    }
    setSeconds(...args: Parameters<Date["setSeconds"]>) {
      return super.setUTCSeconds(...args);
    }
    setMilliseconds(ms: number) {
      return super.setUTCMilliseconds(ms);
    }

    // Preserve static methods
    static now = OriginalDateNow;
    static parse = OriginalDate.parse;
    static UTC = OriginalDate.UTC;
  };
});

afterEach(() => {
  // Restore original Date
  global.Date = OriginalDate;
});

describe("parseRRule", () => {
  it("should parse basic daily recurring rule", () => {
    const result = parseRRule("RRULE:FREQ=DAILY");
    expect(result).toEqual({
      freq: "DAILY",
    });
  });

  it("should parse weekly recurring rule with interval", () => {
    const result = parseRRule("RRULE:FREQ=WEEKLY;INTERVAL=2");
    expect(result).toEqual({
      freq: "WEEKLY",
      interval: 2,
    });
  });

  it("should parse monthly recurring rule with specific days", () => {
    const result = parseRRule("RRULE:FREQ=MONTHLY;BYMONTHDAY=15,30");
    expect(result).toEqual({
      freq: "MONTHLY",
      bymonthday: [15, 30],
    });
  });

  it("should parse weekly recurring rule with specific weekdays", () => {
    const result = parseRRule("RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR");
    expect(result).toEqual({
      freq: "WEEKLY",
      byday: ["MO", "WE", "FR"],
    });
  });

  it("should parse rule with count and until constraints", () => {
    const result = parseRRule("RRULE:FREQ=DAILY;COUNT=10;UNTIL=20241231");
    expect(result).toEqual({
      freq: "DAILY",
      count: 10,
      until: "20241231",
    });
  });

  it("should return null for invalid RRULE format", () => {
    expect(parseRRule("INVALID:FREQ=DAILY")).toBeNull();
    expect(parseRRule("RRULE:INVALID=DAILY")).toBeNull();
    expect(parseRRule("")).toBeNull();
  });

  it("should handle yearly recurring with month specification", () => {
    const result = parseRRule("RRULE:FREQ=YEARLY;BYMONTH=3,6,9,12");
    expect(result).toEqual({
      freq: "YEARLY",
      bymonth: [3, 6, 9, 12],
    });
  });

  it("should parse BYSETPOS for nth occurrence patterns", () => {
    const result = parseRRule("RRULE:FREQ=MONTHLY;BYDAY=MO;BYSETPOS=1,3,-1");
    expect(result).toEqual({
      freq: "MONTHLY",
      byday: ["MO"],
      bysetpos: [1, 3, -1],
    });
  });
});

describe("dateMatchesRecurringPattern", () => {
  const referenceDate = new Date("2024-01-15T10:00:00.000Z"); // Monday, Jan 15, 2024

  describe("DAILY patterns", () => {
    it("should match the same day for daily pattern", () => {
      const sameDay = new Date("2024-01-15T10:00:00.000Z");
      expect(
        dateMatchesRecurringPattern(sameDay, "RRULE:FREQ=DAILY", referenceDate),
      ).toBe(true);
    });

    it("should match with different times on the same day", () => {
      const sameDayDifferentTime = new Date("2024-01-15T15:30:00.000Z");
      expect(
        dateMatchesRecurringPattern(
          sameDayDifferentTime,
          "RRULE:FREQ=DAILY",
          referenceDate,
        ),
      ).toBe(true);
    });

    it("should match correct intervals for daily pattern", () => {
      const tomorrow = new Date("2024-01-16T10:00:00.000Z");
      const dayAfter = new Date("2024-01-17T10:00:00.000Z");

      expect(
        dateMatchesRecurringPattern(
          tomorrow,
          "RRULE:FREQ=DAILY",
          referenceDate,
        ),
      ).toBe(true);
      expect(
        dateMatchesRecurringPattern(
          dayAfter,
          "RRULE:FREQ=DAILY",
          referenceDate,
        ),
      ).toBe(true);
    });

    it("should handle daily pattern with interval", () => {
      const twoDaysLater = new Date("2024-01-17T10:00:00.000Z");
      const threeDaysLater = new Date("2024-01-18T10:00:00.000Z");
      const fourDaysLater = new Date("2024-01-19T10:00:00.000Z");

      // Every 2 days
      expect(
        dateMatchesRecurringPattern(
          twoDaysLater,
          "RRULE:FREQ=DAILY;INTERVAL=2",
          referenceDate,
        ),
      ).toBe(true);
      expect(
        dateMatchesRecurringPattern(
          threeDaysLater,
          "RRULE:FREQ=DAILY;INTERVAL=2",
          referenceDate,
        ),
      ).toBe(false);
      expect(
        dateMatchesRecurringPattern(
          fourDaysLater,
          "RRULE:FREQ=DAILY;INTERVAL=2",
          referenceDate,
        ),
      ).toBe(true);
    });

    it("should not match dates in the past", () => {
      const yesterday = new Date("2024-01-14T10:00:00.000Z");
      expect(
        dateMatchesRecurringPattern(
          yesterday,
          "RRULE:FREQ=DAILY",
          referenceDate,
        ),
      ).toBe(false);
    });

    it("should handle timezone edge cases correctly", () => {
      // Test that we're using local date comparison, not UTC
      const dateNearMidnight = new Date("2024-01-15T23:59:59.999Z");
      expect(
        dateMatchesRecurringPattern(
          dateNearMidnight,
          "RRULE:FREQ=DAILY",
          referenceDate,
        ),
      ).toBe(true);
    });
  });

  describe("WEEKLY patterns", () => {
    it("should match specific weekdays", () => {
      const monday = new Date("2024-01-22T10:00:00.000Z"); // Next Monday
      const tuesday = new Date("2024-01-23T10:00:00.000Z");
      const wednesday = new Date("2024-01-24T10:00:00.000Z");

      expect(
        dateMatchesRecurringPattern(
          monday,
          "RRULE:FREQ=WEEKLY;BYDAY=MO",
          referenceDate,
        ),
      ).toBe(true);
      expect(
        dateMatchesRecurringPattern(
          tuesday,
          "RRULE:FREQ=WEEKLY;BYDAY=MO",
          referenceDate,
        ),
      ).toBe(false);
      expect(
        dateMatchesRecurringPattern(
          wednesday,
          "RRULE:FREQ=WEEKLY;BYDAY=WE",
          referenceDate,
        ),
      ).toBe(true);
    });

    it("should match multiple weekdays", () => {
      const monday = new Date("2024-01-22T10:00:00.000Z");
      const wednesday = new Date("2024-01-24T10:00:00.000Z");
      const friday = new Date("2024-01-26T10:00:00.000Z");
      const saturday = new Date("2024-01-27T10:00:00.000Z");

      const pattern = "RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR";
      expect(dateMatchesRecurringPattern(monday, pattern, referenceDate)).toBe(
        true,
      );
      expect(
        dateMatchesRecurringPattern(wednesday, pattern, referenceDate),
      ).toBe(true);
      expect(dateMatchesRecurringPattern(friday, pattern, referenceDate)).toBe(
        true,
      );
      expect(
        dateMatchesRecurringPattern(saturday, pattern, referenceDate),
      ).toBe(false);
    });

    it("should match simple weekly pattern (same day of week)", () => {
      const nextMonday = new Date("2024-01-22T10:00:00.000Z");
      const mondayAfter = new Date("2024-01-29T10:00:00.000Z");
      const tuesday = new Date("2024-01-23T10:00:00.000Z");

      expect(
        dateMatchesRecurringPattern(
          nextMonday,
          "RRULE:FREQ=WEEKLY",
          referenceDate,
        ),
      ).toBe(true);
      expect(
        dateMatchesRecurringPattern(
          mondayAfter,
          "RRULE:FREQ=WEEKLY",
          referenceDate,
        ),
      ).toBe(true);
      expect(
        dateMatchesRecurringPattern(
          tuesday,
          "RRULE:FREQ=WEEKLY",
          referenceDate,
        ),
      ).toBe(false);
    });

    it("should handle weekly pattern with interval", () => {
      const twoWeeksLater = new Date("2024-01-29T10:00:00.000Z"); // 2 weeks later, Monday
      const threeWeeksLater = new Date("2024-02-05T10:00:00.000Z"); // 3 weeks later, Monday
      const fourWeeksLater = new Date("2024-02-12T10:00:00.000Z"); // 4 weeks later, Monday

      // Every 2 weeks
      expect(
        dateMatchesRecurringPattern(
          twoWeeksLater,
          "RRULE:FREQ=WEEKLY;INTERVAL=2",
          referenceDate,
        ),
      ).toBe(true);
      expect(
        dateMatchesRecurringPattern(
          threeWeeksLater,
          "RRULE:FREQ=WEEKLY;INTERVAL=2",
          referenceDate,
        ),
      ).toBe(false);
      expect(
        dateMatchesRecurringPattern(
          fourWeeksLater,
          "RRULE:FREQ=WEEKLY;INTERVAL=2",
          referenceDate,
        ),
      ).toBe(true);
    });
  });

  describe("MONTHLY patterns", () => {
    it("should match specific month days", () => {
      const fifteenth = new Date("2024-02-15T10:00:00.000Z");
      const tenth = new Date("2024-02-10T10:00:00.000Z");

      expect(
        dateMatchesRecurringPattern(
          fifteenth,
          "RRULE:FREQ=MONTHLY;BYMONTHDAY=15",
          referenceDate,
        ),
      ).toBe(true);
      expect(
        dateMatchesRecurringPattern(
          tenth,
          "RRULE:FREQ=MONTHLY;BYMONTHDAY=15",
          referenceDate,
        ),
      ).toBe(false);
      expect(
        dateMatchesRecurringPattern(
          tenth,
          "RRULE:FREQ=MONTHLY;BYMONTHDAY=10",
          referenceDate,
        ),
      ).toBe(true);
    });

    it("should match multiple month days", () => {
      const tenth = new Date("2024-02-10T10:00:00.000Z");
      const fifteenth = new Date("2024-02-15T10:00:00.000Z");
      const twentieth = new Date("2024-02-20T10:00:00.000Z");
      const twentyFifth = new Date("2024-02-25T10:00:00.000Z");

      const pattern = "RRULE:FREQ=MONTHLY;BYMONTHDAY=10,20";
      expect(dateMatchesRecurringPattern(tenth, pattern, referenceDate)).toBe(
        true,
      );
      expect(
        dateMatchesRecurringPattern(fifteenth, pattern, referenceDate),
      ).toBe(false);
      expect(
        dateMatchesRecurringPattern(twentieth, pattern, referenceDate),
      ).toBe(true);
      expect(
        dateMatchesRecurringPattern(twentyFifth, pattern, referenceDate),
      ).toBe(false);
    });

    it("should match simple monthly pattern (same day of month)", () => {
      const feb15 = new Date("2024-02-15T10:00:00.000Z");
      const mar15 = new Date("2024-03-15T10:00:00.000Z");
      const feb16 = new Date("2024-02-16T10:00:00.000Z");

      expect(
        dateMatchesRecurringPattern(feb15, "RRULE:FREQ=MONTHLY", referenceDate),
      ).toBe(true);
      expect(
        dateMatchesRecurringPattern(mar15, "RRULE:FREQ=MONTHLY", referenceDate),
      ).toBe(true);
      expect(
        dateMatchesRecurringPattern(feb16, "RRULE:FREQ=MONTHLY", referenceDate),
      ).toBe(false);
    });
  });

  describe("YEARLY patterns", () => {
    it("should match same month and day each year", () => {
      const nextYear = new Date("2025-01-15T10:00:00.000Z");
      const yearAfter = new Date("2026-01-15T10:00:00.000Z");
      const wrongMonth = new Date("2025-02-15T10:00:00.000Z");
      const wrongDay = new Date("2025-01-16T10:00:00.000Z");

      expect(
        dateMatchesRecurringPattern(
          nextYear,
          "RRULE:FREQ=YEARLY",
          referenceDate,
        ),
      ).toBe(true);
      expect(
        dateMatchesRecurringPattern(
          yearAfter,
          "RRULE:FREQ=YEARLY",
          referenceDate,
        ),
      ).toBe(true);
      expect(
        dateMatchesRecurringPattern(
          wrongMonth,
          "RRULE:FREQ=YEARLY",
          referenceDate,
        ),
      ).toBe(false);
      expect(
        dateMatchesRecurringPattern(
          wrongDay,
          "RRULE:FREQ=YEARLY",
          referenceDate,
        ),
      ).toBe(false);
    });

    it("should handle leap year dates correctly", () => {
      const leapRef = new Date("2024-02-29T10:00:00.000Z");
      const nextLeapYear = new Date("2028-02-29T10:00:00.000Z");
      const nonLeapYear = new Date("2025-02-28T10:00:00.000Z");

      expect(
        dateMatchesRecurringPattern(nextLeapYear, "RRULE:FREQ=YEARLY", leapRef),
      ).toBe(true);
      expect(
        dateMatchesRecurringPattern(nonLeapYear, "RRULE:FREQ=YEARLY", leapRef),
      ).toBe(false);
    });
  });

  describe("Edge cases and error handling", () => {
    it("should handle invalid RRULE format", () => {
      const testDate = new Date("2024-01-16T10:00:00.000Z");
      expect(
        dateMatchesRecurringPattern(testDate, "INVALID", referenceDate),
      ).toBe(false);
      expect(dateMatchesRecurringPattern(testDate, "", referenceDate)).toBe(
        false,
      );
      expect(
        dateMatchesRecurringPattern(testDate, "FREQ=DAILY", referenceDate),
      ).toBe(false); // Missing RRULE:
    });

    it("should handle unknown frequency", () => {
      const testDate = new Date("2024-01-16T10:00:00.000Z");
      expect(
        dateMatchesRecurringPattern(
          testDate,
          "RRULE:FREQ=UNKNOWN",
          referenceDate,
        ),
      ).toBe(false);
    });

    it("should handle invalid weekday codes", () => {
      const monday = new Date("2024-01-22T10:00:00.000Z");
      expect(
        dateMatchesRecurringPattern(
          monday,
          "RRULE:FREQ=WEEKLY;BYDAY=XX",
          referenceDate,
        ),
      ).toBe(false);
    });

    it("should correctly normalize dates for comparison", () => {
      // Test that time differences don't affect date matching
      const date1 = new Date("2024-01-15T00:00:00.000Z");
      const date2 = new Date("2024-01-15T23:59:59.999Z");
      const ref = new Date("2024-01-15T12:00:00.000Z");

      expect(dateMatchesRecurringPattern(date1, "RRULE:FREQ=DAILY", ref)).toBe(
        true,
      );
      expect(dateMatchesRecurringPattern(date2, "RRULE:FREQ=DAILY", ref)).toBe(
        true,
      );
    });
  });
});

describe("calculateNextDueDate", () => {
  const baseDate = new Date("2024-01-15T10:00:00.000Z");

  it("should calculate next daily occurrence", () => {
    const nextDate = calculateNextDueDate("RRULE:FREQ=DAILY", baseDate);
    expect(nextDate).toEqual(new Date("2024-01-16T10:00:00.000Z"));
  });

  it("should calculate next daily occurrence with interval", () => {
    const nextDate = calculateNextDueDate(
      "RRULE:FREQ=DAILY;INTERVAL=3",
      baseDate,
    );
    expect(nextDate).toEqual(new Date("2024-01-18T10:00:00.000Z"));
  });

  it("should calculate next weekly occurrence", () => {
    const nextDate = calculateNextDueDate("RRULE:FREQ=WEEKLY", baseDate);
    expect(nextDate).toEqual(new Date("2024-01-22T10:00:00.000Z"));
  });

  it("should calculate next weekly occurrence with specific weekdays", () => {
    // Starting from Monday (2024-01-15), next occurrence should be Wednesday
    const nextDate = calculateNextDueDate(
      "RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR",
      baseDate,
    );
    expect(nextDate).toEqual(new Date("2024-01-17T10:00:00.000Z"));
  });

  it("should calculate next monthly occurrence", () => {
    const nextDate = calculateNextDueDate("RRULE:FREQ=MONTHLY", baseDate);
    expect(nextDate).toEqual(new Date("2024-02-15T10:00:00.000Z"));
  });

  it("should calculate next monthly occurrence with specific day", () => {
    const nextDate = calculateNextDueDate(
      "RRULE:FREQ=MONTHLY;BYMONTHDAY=28",
      baseDate,
    );
    expect(nextDate).toEqual(new Date("2024-02-28T10:00:00.000Z"));
  });

  it("should handle month-end dates correctly", () => {
    // January 31st should go to February 28th (last day of February)
    const endOfMonth = new Date("2023-01-31T10:00:00.000Z");
    const nextDate = calculateNextDueDate("RRULE:FREQ=MONTHLY", endOfMonth);
    // Should go to February 28th, not March 31st
    expect(nextDate).toEqual(new Date("2023-02-28T10:00:00.000Z"));
  });

  it("should handle leap year month-end dates correctly", () => {
    // January 31st 2024 (leap year) should go to February 29th
    const endOfMonth = new Date("2024-01-31T10:00:00.000Z");
    const nextDate = calculateNextDueDate("RRULE:FREQ=MONTHLY", endOfMonth);
    // Should go to February 29th in leap year
    expect(nextDate).toEqual(new Date("2024-02-29T10:00:00.000Z"));
  });

  it("should handle multiple month-end transitions", () => {
    // May 31st should go to June 30th (June has only 30 days)
    const endOfMonth = new Date("2023-05-31T10:00:00.000Z");
    const nextDate = calculateNextDueDate("RRULE:FREQ=MONTHLY", endOfMonth);
    // Should go to June 30th, not July 1st
    expect(nextDate).toEqual(new Date("2023-06-30T10:00:00.000Z"));
  });

  it("should calculate next yearly occurrence", () => {
    const nextDate = calculateNextDueDate("RRULE:FREQ=YEARLY", baseDate);
    expect(nextDate).toEqual(new Date("2025-01-15T10:00:00.000Z"));
  });

  it("should respect UNTIL constraint", () => {
    const untilDate = "20240117"; // January 17, 2024 (one day after next occurrence)
    const nextDate = calculateNextDueDate(
      `RRULE:FREQ=DAILY;UNTIL=${untilDate}`,
      baseDate,
    );
    expect(nextDate).toEqual(new Date("2024-01-16T10:00:00.000Z"));
  });

  it("should return null when past UNTIL constraint", () => {
    const untilDate = "20240115"; // Same day as base date
    const nextDate = calculateNextDueDate(
      `RRULE:FREQ=DAILY;UNTIL=${untilDate}`,
      baseDate,
    );
    expect(nextDate).toBeNull();
  });

  it("should return null for invalid RRULE", () => {
    const nextDate = calculateNextDueDate("INVALID:FREQ=DAILY", baseDate);
    expect(nextDate).toBeNull();
  });

  it("should handle weekly recurrence with no matching weekdays gracefully", () => {
    const nextDate = calculateNextDueDate("RRULE:FREQ=WEEKLY;BYDAY=", baseDate);
    // Returns null for empty BYDAY array
    expect(nextDate).toBeNull();
  });

  describe("multi-select patterns", () => {
    it("should handle multiple BYMONTHDAY values", () => {
      // From Jan 15th, next occurrence on 20th or 25th should be Jan 20th
      const nextDate = calculateNextDueDate(
        "RRULE:FREQ=MONTHLY;BYMONTHDAY=20,25",
        baseDate,
      );
      expect(nextDate).toEqual(new Date("2024-02-20T10:00:00.000Z"));
    });

    it("should handle multiple BYMONTHDAY values with earlier day first", () => {
      // From Jan 15th, next occurrence on 10th or 25th should be Feb 10th (earlier day)
      const nextDate = calculateNextDueDate(
        "RRULE:FREQ=MONTHLY;BYMONTHDAY=10,25",
        baseDate,
      );
      expect(nextDate).toEqual(new Date("2024-02-10T10:00:00.000Z"));
    });

    it("should handle multiple BYMONTHDAY with -1 (last day)", () => {
      // From Jan 15th, next occurrence on 28th or last day should be Feb 28th
      const nextDate = calculateNextDueDate(
        "RRULE:FREQ=MONTHLY;BYMONTHDAY=28,-1",
        baseDate,
      );
      expect(nextDate).toEqual(new Date("2024-02-28T10:00:00.000Z"));
    });

    it("should handle yearly with multiple BYMONTH values", () => {
      // From Jan 15th, next occurrence in March or June should be March 15th
      const nextDate = calculateNextDueDate(
        "RRULE:FREQ=YEARLY;BYMONTH=3,6",
        baseDate,
      );
      expect(nextDate).toEqual(new Date("2024-03-15T10:00:00.000Z"));
    });

    it("should handle yearly with multiple BYMONTH values (later in year)", () => {
      // From Jan 15th, next occurrence in June or September should be June 15th
      const nextDate = calculateNextDueDate(
        "RRULE:FREQ=YEARLY;BYMONTH=6,9",
        baseDate,
      );
      expect(nextDate).toEqual(new Date("2024-06-15T10:00:00.000Z"));
    });

    it("should handle yearly with multiple BYMONTH rolling to next year", () => {
      // From Dec 15th, next occurrence in March or June should be next year's March
      const decemberDate = new Date("2024-12-15T10:00:00.000Z");
      const nextDate = calculateNextDueDate(
        "RRULE:FREQ=YEARLY;BYMONTH=3,6",
        decemberDate,
      );
      expect(nextDate).toEqual(new Date("2025-03-15T10:00:00.000Z"));
    });

    it("should handle month-end edge cases with multiple days", () => {
      // From Jan 31st, next occurrence on 28th or 30th should be Feb 28th in non-leap year
      const endOfJan2023 = new Date("2023-01-31T10:00:00.000Z");
      const nextDate = calculateNextDueDate(
        "RRULE:FREQ=MONTHLY;BYMONTHDAY=28,30",
        endOfJan2023,
      );
      expect(nextDate).toEqual(new Date("2023-02-28T10:00:00.000Z"));
    });

    it("should handle leap year with multiple days including February", () => {
      // From Jan 31st 2024 (leap year), next occurrence on 29th or 30th should be Feb 29th
      const endOfJan2024 = new Date("2024-01-31T10:00:00.000Z");
      const nextDate = calculateNextDueDate(
        "RRULE:FREQ=MONTHLY;BYMONTHDAY=29,30",
        endOfJan2024,
      );
      expect(nextDate).toEqual(new Date("2024-02-29T10:00:00.000Z"));
    });
  });

  describe("includeFromDate flag", () => {
    // Mock the current date to be consistent across tests
    const mockToday = new Date("2024-01-20T15:30:00.000Z");

    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(mockToday);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should include today for daily recurring when fromDate is today", () => {
      const todayDate = new Date("2024-01-20T10:00:00.000Z");
      const nextDate = calculateNextDueDate(
        "RRULE:FREQ=DAILY",
        todayDate,
        true,
      );
      // Should return today's date (same day, preserving time)
      expect(nextDate).toEqual(new Date("2024-01-20T10:00:00.000Z"));
    });

    it("should include fromDate when it matches pattern, even if in the past", () => {
      const pastDate = new Date("2024-01-19T10:00:00.000Z");
      const nextDate = calculateNextDueDate("RRULE:FREQ=DAILY", pastDate, true);
      // Should return the fromDate since it matches the daily pattern (any date matches daily)
      expect(nextDate).toEqual(new Date("2024-01-19T10:00:00.000Z"));
    });

    it("should include fromDate when it matches pattern, even if in the future", () => {
      const futureDate = new Date("2024-01-22T10:00:00.000Z");
      const nextDate = calculateNextDueDate(
        "RRULE:FREQ=DAILY",
        futureDate,
        true,
      );
      // Should return the fromDate since it matches the daily pattern (any date matches daily)
      expect(nextDate).toEqual(new Date("2024-01-22T10:00:00.000Z"));
    });

    it("should work with weekly recurrence when today is the due date", () => {
      const todayDate = new Date("2024-01-20T14:00:00.000Z");
      const nextDate = calculateNextDueDate(
        "RRULE:FREQ=WEEKLY",
        todayDate,
        true,
      );
      // Should return today (same day, preserving time)
      expect(nextDate).toEqual(new Date("2024-01-20T14:00:00.000Z"));
    });

    it("should work with monthly recurrence when today is the due date", () => {
      const todayDate = new Date("2024-01-20T09:00:00.000Z");
      const nextDate = calculateNextDueDate(
        "RRULE:FREQ=MONTHLY",
        todayDate,
        true,
      );
      // Should return today (same day, preserving time)
      expect(nextDate).toEqual(new Date("2024-01-20T09:00:00.000Z"));
    });

    it("should work with yearly recurrence when today is the due date", () => {
      const todayDate = new Date("2024-01-20T12:00:00.000Z");
      const nextDate = calculateNextDueDate(
        "RRULE:FREQ=YEARLY",
        todayDate,
        true,
      );
      // Should return today (same day, preserving time)
      expect(nextDate).toEqual(new Date("2024-01-20T12:00:00.000Z"));
    });

    it("should ignore includeFromDate flag when set to false", () => {
      const todayDate = new Date("2024-01-20T10:00:00.000Z");
      const nextDate = calculateNextDueDate(
        "RRULE:FREQ=DAILY",
        todayDate,
        false,
      );
      // Should return tomorrow (normal behavior)
      expect(nextDate).toEqual(new Date("2024-01-21T10:00:00.000Z"));
    });

    it("should handle timezone differences correctly", () => {
      // Test with a date that's today in one timezone but different in UTC
      const todayDifferentTime = new Date("2024-01-20T23:59:59.000Z");
      const nextDate = calculateNextDueDate(
        "RRULE:FREQ=DAILY",
        todayDifferentTime,
        true,
      );
      // Should still return the same date (UTC comparison should work)
      expect(nextDate).toEqual(new Date("2024-01-20T23:59:59.000Z"));
    });

    it("should handle different time zones for same calendar day", () => {
      // Test with early morning today (could be yesterday in some timezones)
      const earlyTodayUTC = new Date("2024-01-20T01:00:00.000Z");
      const nextDate = calculateNextDueDate(
        "RRULE:FREQ=DAILY",
        earlyTodayUTC,
        true,
      );
      // Should return the same date since it's the same calendar day in UTC
      expect(nextDate).toEqual(new Date("2024-01-20T01:00:00.000Z"));
    });

    it("should work with complex RRULE when today matches", () => {
      const todayDate = new Date("2024-01-20T16:00:00.000Z"); // Saturday
      const nextDate = calculateNextDueDate(
        "RRULE:FREQ=WEEKLY;BYDAY=SA;INTERVAL=2",
        todayDate,
        true,
      );
      // Should return today since it's Saturday and matches the pattern
      expect(nextDate).toEqual(new Date("2024-01-20T16:00:00.000Z"));
    });

    it("should handle UNTIL constraint with includeFromDate", () => {
      const todayDate = new Date("2024-01-20T10:00:00.000Z");
      const nextDate = calculateNextDueDate(
        "RRULE:FREQ=DAILY;UNTIL=20240120",
        todayDate,
        true,
      );
      // Should return today since it's within the UNTIL constraint
      expect(nextDate).toEqual(new Date("2024-01-20T10:00:00.000Z"));
    });

    it("should return null when today exceeds UNTIL constraint", () => {
      const todayDate = new Date("2024-01-20T10:00:00.000Z");
      const nextDate = calculateNextDueDate(
        "RRULE:FREQ=DAILY;UNTIL=20240119",
        todayDate,
        true,
      );
      // Should return null since today is past the UNTIL date
      expect(nextDate).toBeNull();
    });
  });

  describe("Timezone handling", () => {
    it("should handle EST vs UTC timezone differences correctly for weekly RRULE", () => {
      // With our Date mock, all operations use UTC, so we need to create dates accordingly
      // Create Sep 11, 2024 at midnight UTC
      const normalizedEstDate = new Date(Date.UTC(2024, 8, 11, 0, 0, 0, 0));

      // Test weekly RRULE with includeFromDate=true
      // Since it's a weekly pattern and we're including fromDate,
      // it should return the normalized date (Sep 11) because any date matches weekly pattern
      const weeklyRRule = "RRULE:FREQ=WEEKLY";

      const result = calculateNextDueDate(weeklyRRule, normalizedEstDate, true);

      // Should return the same date because:
      // 1. includeFromDate=true
      // 2. Weekly pattern matches any day (normalized date matches weekly pattern)
      expect(result).toEqual(normalizedEstDate);
      expect(result?.getDate()).toBe(11); // Should be Sep 11, not Sep 18
    });

    it("should handle daily recurring pattern with timezone normalization", () => {
      // Test daily recurring with normalized dates
      const normalizedDate = new Date(2024, 8, 11); // Sep 11, 2024 (month is 0-indexed)

      const result = calculateNextDueDate(
        "RRULE:FREQ=DAILY",
        normalizedDate,
        true,
      );

      // For daily recurring with includeFromDate=true, should return same date
      expect(result).toEqual(normalizedDate);
    });
  });
});

describe("calculateNextDueDate - Comprehensive UI Pattern Coverage", () => {
  const baseDate = new Date("2024-01-15T10:00:00.000Z"); // Monday, January 15

  describe("Individual weekday patterns (from Agent1)", () => {
    it("should handle everyMonday pattern", () => {
      // From Tuesday (Jan 16), next Monday should be Jan 22
      const tuesdayDate = new Date("2024-01-16T10:00:00.000Z");
      const nextDate = calculateNextDueDate(
        "RRULE:FREQ=WEEKLY;BYDAY=MO",
        tuesdayDate,
      );
      expect(nextDate).toEqual(new Date("2024-01-22T10:00:00.000Z"));
    });

    it("should handle everyTuesday pattern", () => {
      // From Monday (Jan 15), next Tuesday should be Jan 16
      const mondayDate = new Date("2024-01-15T10:00:00.000Z");
      const nextDate = calculateNextDueDate(
        "RRULE:FREQ=WEEKLY;BYDAY=TU",
        mondayDate,
      );
      expect(nextDate).toEqual(new Date("2024-01-16T10:00:00.000Z"));
    });

    it("should handle everyWednesday pattern", () => {
      const nextDate = calculateNextDueDate(
        "RRULE:FREQ=WEEKLY;BYDAY=WE",
        baseDate,
      );
      expect(nextDate).toEqual(new Date("2024-01-17T10:00:00.000Z"));
    });

    it("should handle everyFriday pattern", () => {
      const nextDate = calculateNextDueDate(
        "RRULE:FREQ=WEEKLY;BYDAY=FR",
        baseDate,
      );
      expect(nextDate).toEqual(new Date("2024-01-19T10:00:00.000Z"));
    });

    it("should handle everySunday pattern", () => {
      const nextDate = calculateNextDueDate(
        "RRULE:FREQ=WEEKLY;BYDAY=SU",
        baseDate,
      );
      expect(nextDate).toEqual(new Date("2024-01-21T10:00:00.000Z"));
    });
  });

  describe("Weekday/weekend group patterns (from Agent1)", () => {
    it("should handle everyWeekday pattern (Mo-Fr)", () => {
      // From Monday (Jan 15), next weekday should be Tuesday (Jan 16)
      const nextDate = calculateNextDueDate(
        "RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR",
        baseDate,
      );
      expect(nextDate).toEqual(new Date("2024-01-16T10:00:00.000Z"));
    });

    it("should handle everyWeekday pattern from Friday", () => {
      // From Friday (Jan 19), next weekday should be Monday (Jan 22)
      const fridayDate = new Date("2024-01-19T10:00:00.000Z");
      const nextDate = calculateNextDueDate(
        "RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR",
        fridayDate,
      );
      expect(nextDate).toEqual(new Date("2024-01-22T10:00:00.000Z"));
    });

    it("should handle everyWeekend pattern (Sa-Su)", () => {
      // From Friday (Jan 19), next weekend should be Saturday (Jan 20)
      const fridayDate = new Date("2024-01-19T10:00:00.000Z");
      const nextDate = calculateNextDueDate(
        "RRULE:FREQ=WEEKLY;BYDAY=SA,SU",
        fridayDate,
      );
      expect(nextDate).toEqual(new Date("2024-01-20T10:00:00.000Z"));
    });

    it("should handle everyWeekend pattern from Sunday", () => {
      // From Sunday (Jan 21), next weekend should be Saturday (Jan 27)
      const sundayDate = new Date("2024-01-21T10:00:00.000Z");
      const nextDate = calculateNextDueDate(
        "RRULE:FREQ=WEEKLY;BYDAY=SA,SU",
        sundayDate,
      );
      expect(nextDate).toEqual(new Date("2024-01-27T10:00:00.000Z"));
    });
  });

  describe("BYSETPOS patterns (from Agent4)", () => {
    it("should calculate first Monday of each month", () => {
      const nextDate = calculateNextDueDate(
        "RRULE:FREQ=MONTHLY;BYDAY=MO;BYSETPOS=1",
        baseDate,
      );
      // First Monday in February 2024 is February 5th
      expect(nextDate).toEqual(new Date("2024-02-05T10:00:00.000Z"));
    });

    it("should calculate second Tuesday of each month", () => {
      const nextDate = calculateNextDueDate(
        "RRULE:FREQ=MONTHLY;BYDAY=TU;BYSETPOS=2",
        baseDate,
      );
      // Second Tuesday in February 2024 is February 13th
      expect(nextDate).toEqual(new Date("2024-02-13T10:00:00.000Z"));
    });

    it("should calculate last Friday of each month", () => {
      const nextDate = calculateNextDueDate(
        "RRULE:FREQ=MONTHLY;BYDAY=FR;BYSETPOS=-1",
        baseDate,
      );
      // Last Friday in February 2024 is February 23rd
      expect(nextDate).toEqual(new Date("2024-02-23T10:00:00.000Z"));
    });

    it("should handle multiple BYSETPOS values (first and third Monday)", () => {
      const nextDate = calculateNextDueDate(
        "RRULE:FREQ=MONTHLY;BYDAY=MO;BYSETPOS=1,3",
        baseDate,
      );
      // Next occurrence should be first Monday in February (Feb 5th)
      expect(nextDate).toEqual(new Date("2024-02-05T10:00:00.000Z"));
    });

    it("should return null when BYSETPOS exceeds available occurrences", () => {
      // Fifth Monday doesn't exist in most months
      const nextDate = calculateNextDueDate(
        "RRULE:FREQ=MONTHLY;BYDAY=MO;BYSETPOS=5",
        baseDate,
      );
      expect(nextDate).toBeNull();
    });

    it("should handle yearly BYSETPOS patterns - Thanksgiving (4th Thursday in November)", () => {
      const nextDate = calculateNextDueDate(
        "RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=TH;BYSETPOS=4",
        baseDate,
      );
      // Fourth Thursday in November 2024 is November 28th
      expect(nextDate).toEqual(new Date("2024-11-28T10:00:00.000Z"));
    });

    it("should handle yearly BYSETPOS patterns - second Sunday in March", () => {
      const nextDate = calculateNextDueDate(
        "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=SU;BYSETPOS=2",
        baseDate,
      );
      // Second Sunday in March 2024 is March 10th
      expect(nextDate).toEqual(new Date("2024-03-10T10:00:00.000Z"));
    });

    it("should handle yearly BYSETPOS patterns - last Monday in May", () => {
      const nextDate = calculateNextDueDate(
        "RRULE:FREQ=YEARLY;BYMONTH=5;BYDAY=MO;BYSETPOS=-1",
        baseDate,
      );
      // Last Monday in May 2024 is May 27th
      expect(nextDate).toEqual(new Date("2024-05-27T10:00:00.000Z"));
    });
  });

  describe("Interval patterns with frequencies > 1 (from Agent1)", () => {
    it("should handle weekly pattern with interval > 1", () => {
      // Every 2 weeks on Monday, from Monday (Jan 15), should go to Jan 29
      const mondayDate = new Date("2024-01-15T10:00:00.000Z");
      const nextDate = calculateNextDueDate(
        "RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=MO",
        mondayDate,
      );
      expect(nextDate).toEqual(new Date("2024-01-29T10:00:00.000Z"));
    });

    it("should handle monthly pattern with interval > 1", () => {
      // Every 3 months, from Jan 15, should go to Apr 15
      const janDate = new Date("2024-01-15T10:00:00.000Z");
      const nextDate = calculateNextDueDate(
        "RRULE:FREQ=MONTHLY;INTERVAL=3",
        janDate,
      );
      expect(nextDate).toEqual(new Date("2024-04-15T10:00:00.000Z"));
    });

    it("should handle yearly pattern with interval > 1", () => {
      // Every 2 years, from Jan 15 2024, should go to Jan 15 2026
      const date2024 = new Date("2024-01-15T10:00:00.000Z");
      const nextDate = calculateNextDueDate(
        "RRULE:FREQ=YEARLY;INTERVAL=2",
        date2024,
      );
      expect(nextDate).toEqual(new Date("2026-01-15T10:00:00.000Z"));
    });

    it("should handle monthly patterns with intervals and BYSETPOS", () => {
      const nextDate = calculateNextDueDate(
        "RRULE:FREQ=MONTHLY;INTERVAL=6;BYDAY=MO;BYSETPOS=1",
        baseDate,
      );
      // Every 6 months from January → July, first Monday in July 2024 is July 1st
      expect(nextDate).toEqual(new Date("2024-07-01T10:00:00.000Z"));
    });
  });

  describe("Edge cases and validation (from Agent3)", () => {
    it("should handle BYSETPOS=0 as invalid", () => {
      const nextDate = calculateNextDueDate(
        "RRULE:FREQ=MONTHLY;BYDAY=MO;BYSETPOS=0",
        baseDate,
      );
      // BYSETPOS=0 is invalid per RFC5545
      expect(nextDate).toBeNull();
    });

    it("should handle negative BYSETPOS beyond -1", () => {
      const nextDate = calculateNextDueDate(
        "RRULE:FREQ=MONTHLY;BYDAY=MO;BYSETPOS=-2",
        baseDate,
      );
      // Second-to-last Monday in February 2024 (Feb 19th)
      expect(nextDate).toEqual(new Date("2024-02-19T10:00:00.000Z"));
    });

    it("should handle leap year with February 29th", () => {
      const nextDate = calculateNextDueDate(
        "RRULE:FREQ=YEARLY;BYMONTH=2;BYMONTHDAY=29",
        baseDate,
      );
      // February 29th, 2024 (leap year)
      expect(nextDate).toEqual(new Date("2024-02-29T10:00:00.000Z"));
    });

    it("should preserve time across complex pattern calculations", () => {
      const timeSpecificDate = new Date("2024-01-15T14:30:45.123Z");
      const nextDate = calculateNextDueDate(
        "RRULE:FREQ=MONTHLY;BYDAY=FR;BYSETPOS=-1",
        timeSpecificDate,
      );
      // Should preserve exact time (last Friday in February is Feb 23rd)
      expect(nextDate).toEqual(new Date("2024-02-23T14:30:45.123Z"));
    });

    it("should handle yearly patterns with multiple months (Christmas and New Years)", () => {
      const nextDate = calculateNextDueDate(
        "RRULE:FREQ=YEARLY;BYMONTH=12;BYMONTHDAY=25,31",
        baseDate,
      );
      // Next occurrence: December 25th, 2024
      expect(nextDate).toEqual(new Date("2024-12-25T10:00:00.000Z"));
    });

    it("should roll to next year when all dates have passed", () => {
      const lateDate = new Date("2024-12-30T10:00:00.000Z");
      const nextDate = calculateNextDueDate(
        "RRULE:FREQ=YEARLY;BYMONTH=3,6;BYMONTHDAY=15",
        lateDate,
      );
      // Next occurrence: March 15th, 2025
      expect(nextDate).toEqual(new Date("2025-03-15T10:00:00.000Z"));
    });

    it("should handle COUNT constraint with BYSETPOS patterns", () => {
      const nextDate = calculateNextDueDate(
        "RRULE:FREQ=MONTHLY;BYDAY=MO;BYSETPOS=1;COUNT=3",
        baseDate,
      );
      // First Monday in February (count doesn't affect next date calculation)
      expect(nextDate).toEqual(new Date("2024-02-05T10:00:00.000Z"));
    });

    it("should handle UNTIL constraint with BYSETPOS patterns", () => {
      const nextDate = calculateNextDueDate(
        "RRULE:FREQ=MONTHLY;BYDAY=MO;BYSETPOS=1;UNTIL=20240301",
        baseDate,
      );
      // First Monday in February is Feb 5th, which is before March 1st
      expect(nextDate).toEqual(new Date("2024-02-05T10:00:00.000Z"));
    });

    it("should return null when UNTIL constraint blocks BYSETPOS pattern", () => {
      const nextDate = calculateNextDueDate(
        "RRULE:FREQ=MONTHLY;BYDAY=MO;BYSETPOS=1;UNTIL=20240201",
        baseDate,
      );
      // First Monday in February is Feb 5th, which is after Feb 1st UNTIL constraint
      expect(nextDate).toBeNull();
    });
  });
});

describe("generateNextTaskInstance", () => {
  const baseTask: Task = {
    id: createTaskId("550e8400-e29b-41d4-a716-446655440001"),
    title: "Daily standup",
    completed: true,
    completedAt: new Date("2024-01-15T10:00:00.000Z"),
    dueDate: new Date("2024-01-15T09:00:00.000Z"),
    recurring: "RRULE:FREQ=DAILY",
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    recurringMode: "dueDate",
    priority: 2 satisfies TaskPriority,
    labels: [],
    projectId: undefined,
    description: "Daily team standup meeting",
    subtasks: [],
    comments: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should generate next task instance for daily recurring task", () => {
    const nextTask = generateNextTaskInstance(baseTask);

    expect(nextTask).not.toBeNull();
    if (nextTask) {
      expect(nextTask.id).toBe("550e8400-e29b-41d4-a716-446655440000");
      expect(nextTask.title).toBe("Daily standup");
      expect(nextTask.completed).toBe(false);
      expect(nextTask.completedAt).toBeUndefined();
      expect(nextTask.dueDate).toEqual(new Date("2024-01-16T09:00:00.000Z"));
      expect(nextTask.recurring).toBe("RRULE:FREQ=DAILY");
      // Status feature removed
      expect(nextTask.description).toBe("Daily team standup meeting");
    }
  });

  it("should return null for task without recurring pattern", () => {
    const nonRecurringTask = { ...baseTask, recurring: undefined };
    const nextTask = generateNextTaskInstance(nonRecurringTask);
    expect(nextTask).toBeNull();
  });

  it("should return null for task without due date", () => {
    const taskWithoutDueDate = { ...baseTask, dueDate: undefined };
    const nextTask = generateNextTaskInstance(taskWithoutDueDate);
    expect(nextTask).toBeNull();
  });

  it("should return null when RRULE reaches end constraint", () => {
    const taskWithEndDate = {
      ...baseTask,
      recurring: "RRULE:FREQ=DAILY;UNTIL=20240115", // Same as due date
    };
    const nextTask = generateNextTaskInstance(taskWithEndDate);
    expect(nextTask).toBeNull();
  });

  it("should preserve all task metadata in next instance", () => {
    const taskWithMetadata: Task = {
      ...baseTask,
      priority: 4 satisfies TaskPriority,
      labels: [
        createLabelId("550e8400-e29b-41d4-a716-446655440010"),
        createLabelId("550e8400-e29b-41d4-a716-446655440011"),
      ],
      projectId: createProjectId("550e8400-e29b-41d4-a716-446655440012"),
      subtasks: [
        {
          id: createSubtaskId("550e8400-e29b-41d4-a716-446655440013"),
          title: "Prep notes",
          completed: false,
        },
      ],
    };

    const nextTask = generateNextTaskInstance(taskWithMetadata);

    if (nextTask) {
      expect(nextTask.priority).toBe(4);
      expect(nextTask.labels).toEqual([
        createLabelId("550e8400-e29b-41d4-a716-446655440010"),
        createLabelId("550e8400-e29b-41d4-a716-446655440011"),
      ]);
      expect(nextTask.projectId).toBe(
        createProjectId("550e8400-e29b-41d4-a716-446655440012"),
      );
      expect(nextTask.subtasks).toEqual([
        {
          id: createSubtaskId("550e8400-e29b-41d4-a716-446655440013"),
          title: "Prep notes",
          completed: false,
        },
      ]);
      // Attachments feature removed
    }
  });

  it("should preserve trackingId in next instance", () => {
    const trackingId = createTaskId("550e8400-e29b-41d4-a716-446655440099");
    const taskWithTrackingId: Task = {
      ...baseTask,
      trackingId,
    };

    const nextTask = generateNextTaskInstance(taskWithTrackingId);

    expect(nextTask).not.toBeNull();
    if (nextTask) {
      // trackingId should be preserved so all recurring instances share the same tracking group
      expect(nextTask.trackingId).toBe(trackingId);
      // But the task ID itself should be different
      expect(nextTask.id).not.toBe(taskWithTrackingId.id);
    }
  });

  it("should generate new creation date for next instance", () => {
    const nextTask = generateNextTaskInstance(baseTask);
    if (nextTask) {
      expect(nextTask.createdAt).toBeInstanceOf(Date);
      // Should be different from original creation date
      expect(nextTask.createdAt).not.toEqual(baseTask.createdAt);
    }
  });

  it("should reset subtask completion status in next instance", () => {
    const taskWithCompletedSubtasks: Task = {
      ...baseTask,
      subtasks: [
        {
          id: createSubtaskId("550e8400-e29b-41d4-a716-446655440013"),
          title: "Prep notes",
          completed: true, // This subtask is completed
        },
        {
          id: createSubtaskId("550e8400-e29b-41d4-a716-446655440014"),
          title: "Send invites",
          completed: false, // This subtask is not completed
        },
      ],
    };

    const nextTask = generateNextTaskInstance(taskWithCompletedSubtasks);

    expect(nextTask).not.toBeNull();
    if (nextTask) {
      // All subtasks in the new instance should be reset to not completed
      expect(nextTask.subtasks).toHaveLength(2);
      const firstSubtask = nextTask.subtasks[0];
      const secondSubtask = nextTask.subtasks[1];
      if (!firstSubtask || !secondSubtask) {
        throw new Error("Expected to find first two subtasks");
      }
      expect(firstSubtask.completed).toBe(false);
      expect(secondSubtask.completed).toBe(false);
      // But titles and IDs should be preserved
      expect(firstSubtask.title).toBe("Prep notes");
      expect(secondSubtask.title).toBe("Send invites");
      expect(firstSubtask.id).toBe(
        createSubtaskId("550e8400-e29b-41d4-a716-446655440013"),
      );
      expect(secondSubtask.id).toBe(
        createSubtaskId("550e8400-e29b-41d4-a716-446655440014"),
      );
    }
  });
});

describe("shouldGenerateNextInstance", () => {
  it("should return true for task with recurring pattern and due date", () => {
    const task: Task = {
      id: createTaskId("550e8400-e29b-41d4-a716-446655440010"),
      title: "Test task",
      completed: false,
      priority: 1,
      labels: [],
      projectId: undefined,
      subtasks: [],
      comments: [],
      createdAt: new Date(),
      recurringMode: "dueDate",
      recurring: "RRULE:FREQ=DAILY",
      dueDate: new Date(),
    };

    expect(shouldGenerateNextInstance(task)).toBe(true);
  });

  it("should return false for task without recurring pattern", () => {
    const task: Task = {
      id: createTaskId("550e8400-e29b-41d4-a716-446655440010"),
      title: "Test task",
      completed: false,
      priority: 1,
      labels: [],
      projectId: undefined,
      subtasks: [],
      comments: [],
      createdAt: new Date(),
      recurringMode: "dueDate",
      recurring: undefined,
      dueDate: new Date(),
    };

    expect(shouldGenerateNextInstance(task)).toBe(false);
  });

  it("should return false for task without due date", () => {
    const task: Task = {
      id: createTaskId("550e8400-e29b-41d4-a716-446655440010"),
      title: "Test task",
      completed: false,
      priority: 1,
      labels: [],
      projectId: undefined,
      subtasks: [],
      comments: [],
      createdAt: new Date(),
      recurringMode: "dueDate",
      recurring: "RRULE:FREQ=DAILY",
      dueDate: undefined,
    };

    expect(shouldGenerateNextInstance(task)).toBe(false);
  });

  it("should return false for task with empty recurring string", () => {
    const task: Task = {
      id: createTaskId("550e8400-e29b-41d4-a716-446655440010"),
      title: "Test task",
      completed: false,
      priority: 1,
      labels: [],
      projectId: undefined,
      subtasks: [],
      comments: [],
      createdAt: new Date(),
      recurringMode: "dueDate",
      recurring: "",
      dueDate: new Date(),
    };

    expect(shouldGenerateNextInstance(task)).toBe(false);
  });
});

describe("processRecurringTaskCompletion", () => {
  const recurringTask: Task = {
    id: createTaskId("550e8400-e29b-41d4-a716-446655440002"),
    title: "Weekly review",
    completed: false,
    dueDate: new Date("2024-01-15T14:00:00.000Z"),
    recurring: "RRULE:FREQ=WEEKLY",
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    recurringMode: "dueDate",
    priority: 2,
    labels: [],
    projectId: undefined,
    subtasks: [],
    comments: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should process recurring task and generate next instance", () => {
    const nextTask = processRecurringTaskCompletion(recurringTask);

    expect(nextTask).not.toBeNull();
    if (nextTask) {
      expect(nextTask.id).toBe("550e8400-e29b-41d4-a716-446655440000");
      expect(nextTask.dueDate).toEqual(new Date("2024-01-22T14:00:00.000Z"));
      expect(nextTask.completed).toBe(false);
    }
  });

  it("should return null for non-recurring task", () => {
    const nonRecurringTask = { ...recurringTask, recurring: undefined };
    const nextTask = processRecurringTaskCompletion(nonRecurringTask);
    expect(nextTask).toBeNull();
  });

  it("should return null for task without due date", () => {
    const taskWithoutDueDate = { ...recurringTask, dueDate: undefined };
    const nextTask = processRecurringTaskCompletion(taskWithoutDueDate);
    expect(nextTask).toBeNull();
  });

  it("should handle complex RRULE patterns", () => {
    const complexRecurringTask = {
      ...recurringTask,
      recurring: "RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR;INTERVAL=2",
    };

    const nextTask = processRecurringTaskCompletion(complexRecurringTask);
    expect(nextTask).not.toBeNull();
    if (nextTask) {
      expect(nextTask.recurring).toBe(
        "RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR;INTERVAL=2",
      );
    }
  });

  it("should handle task with COUNT limitation", () => {
    const limitedTask = {
      ...recurringTask,
      recurring: "RRULE:FREQ=DAILY;COUNT=1",
    };

    // COUNT=1 means this was the last occurrence, no next instance should be created
    const nextTask = processRecurringTaskCompletion(limitedTask);
    expect(nextTask).toBeNull();
  });

  it("should decrement COUNT in next instance", () => {
    const limitedTask = {
      ...recurringTask,
      recurring: "RRULE:FREQ=DAILY;COUNT=3",
    };

    // COUNT=3 should generate next instance with COUNT=2
    const nextTask = processRecurringTaskCompletion(limitedTask);
    expect(nextTask).not.toBeNull();
    if (nextTask) {
      expect(nextTask.recurring).toBe("RRULE:FREQ=DAILY;COUNT=2");
    }
  });

  it("should handle COUNT=2 correctly", () => {
    const limitedTask = {
      ...recurringTask,
      recurring: "RRULE:FREQ=DAILY;COUNT=2",
    };

    // COUNT=2 should generate next instance with COUNT=1 (the final occurrence)
    const nextTask = processRecurringTaskCompletion(limitedTask);
    expect(nextTask).not.toBeNull();
    if (nextTask) {
      expect(nextTask.recurring).toBe("RRULE:FREQ=DAILY;COUNT=1");
    }
  });
});

describe("Edge Cases and Error Handling", () => {
  it("should handle leap year calculations", () => {
    // February 29, 2024 (leap year) recurring monthly
    const leapYearDate = new Date("2024-02-29T10:00:00.000Z");
    const nextDate = calculateNextDueDate("RRULE:FREQ=MONTHLY", leapYearDate);

    // Should preserve the same time (10:00 UTC) without DST shifts
    expect(nextDate).toEqual(new Date("2024-03-29T10:00:00.000Z"));
  });

  it("should preserve time across DST transitions for daily recurring", () => {
    // March 9, 2024 was a DST transition date in many timezones
    const beforeDST = new Date("2024-03-09T14:00:00.000Z");
    const nextDate = calculateNextDueDate("RRULE:FREQ=DAILY", beforeDST);

    // Should preserve the same UTC time, not shift due to DST
    expect(nextDate).toEqual(new Date("2024-03-10T14:00:00.000Z"));
  });

  it("should preserve time across DST transitions for weekly recurring", () => {
    // Test across a week that includes DST transition
    const beforeDST = new Date("2024-03-07T15:30:00.000Z");
    const nextDate = calculateNextDueDate("RRULE:FREQ=WEEKLY", beforeDST);

    // Should preserve the same UTC time
    expect(nextDate).toEqual(new Date("2024-03-14T15:30:00.000Z"));
  });

  it("should handle invalid weekday in BYDAY", () => {
    const baseDate = new Date("2024-01-15T10:00:00.000Z");
    const nextDate = calculateNextDueDate(
      "RRULE:FREQ=WEEKLY;BYDAY=XX,YY",
      baseDate,
    );

    // Returns null for invalid weekday codes
    expect(nextDate).toBeNull();
  });

  it("should handle malformed UNTIL date", () => {
    const baseDate = new Date("2024-01-15T10:00:00.000Z");
    const nextDate = calculateNextDueDate(
      "RRULE:FREQ=DAILY;UNTIL=invalid-date",
      baseDate,
    );

    // Should return null for invalid UNTIL date format
    expect(nextDate).toBeNull();
  });

  it("should handle UNTIL date with wrong format", () => {
    const baseDate = new Date("2024-01-15T10:00:00.000Z");
    const nextDate = calculateNextDueDate(
      "RRULE:FREQ=DAILY;UNTIL=2024-01-20",
      baseDate,
    );

    // Should return null for wrong UNTIL format (should be YYYYMMDD, not YYYY-MM-DD)
    expect(nextDate).toBeNull();
  });

  it("should handle invalid UNTIL date (impossible date)", () => {
    const baseDate = new Date("2024-01-15T10:00:00.000Z");
    const nextDate = calculateNextDueDate(
      "RRULE:FREQ=DAILY;UNTIL=20240231",
      baseDate,
    );

    // Should return null for impossible date (Feb 31st doesn't exist)
    expect(nextDate).toBeNull();
  });

  it("should handle extreme interval values", () => {
    const baseDate = new Date("2024-01-15T10:00:00.000Z");
    const nextDate = calculateNextDueDate(
      "RRULE:FREQ=DAILY;INTERVAL=365",
      baseDate,
    );

    // Add 365 days from Jan 15, 2024 → Jan 14, 2025 (2024 is leap year)
    expect(nextDate).toEqual(new Date("2025-01-14T10:00:00.000Z"));
  });

  it("should handle task with null/undefined properties gracefully", () => {
    const minimalTask: Task = {
      id: createTaskId("550e8400-e29b-41d4-a716-446655440003"),
      title: "Minimal task",
      completed: false,
      priority: 1 satisfies TaskPriority,
      labels: [],
      projectId: undefined,
      subtasks: [],
      comments: [],
      createdAt: new Date(),
      recurringMode: "dueDate",
      dueDate: new Date("2024-01-15T10:00:00.000Z"),
      recurring: "RRULE:FREQ=DAILY",
    };

    const nextTask = processRecurringTaskCompletion(minimalTask);
    expect(nextTask).not.toBeNull();
    if (nextTask) {
      expect(nextTask.title).toBe("Minimal task");
    }
  });
});

describe("recurringMode functionality", () => {
  const baseTask: Task = {
    id: createTaskId("550e8400-e29b-41d4-a716-446655440010"),
    title: "Recurring mode test task",
    completed: true,
    dueDate: new Date("2024-01-15T14:00:00.000Z"), // Monday
    completedAt: new Date("2024-01-17T16:30:00.000Z"), // Wednesday
    recurring: "RRULE:FREQ=WEEKLY",
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    recurringMode: "dueDate",
    priority: 2,
    labels: [],
    projectId: undefined,
    subtasks: [],
    comments: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should use due date when recurringMode is 'dueDate' (default behavior)", () => {
    const taskWithDueDateMode = {
      ...baseTask,
      recurringMode: "dueDate" as const,
    };

    const nextTask = generateNextTaskInstance(taskWithDueDateMode);

    expect(nextTask).not.toBeNull();
    if (nextTask) {
      // Should calculate from due date (Monday): next Monday
      expect(nextTask.dueDate).toEqual(new Date("2024-01-22T14:00:00.000Z"));
    }
  });

  it("should use completion date when recurringMode is 'completedAt'", () => {
    const taskWithCompletedAtMode = {
      ...baseTask,
      recurringMode: "completedAt" as const,
    };

    const nextTask = generateNextTaskInstance(taskWithCompletedAtMode);

    expect(nextTask).not.toBeNull();
    if (nextTask) {
      // Should calculate from completion date (Wednesday): next Wednesday
      expect(nextTask.dueDate).toEqual(new Date("2024-01-24T16:30:00.000Z"));
    }
  });

  it("should fallback to due date when recurringMode is 'completedAt' but completedAt is missing", () => {
    const taskWithoutCompletedAt = {
      ...baseTask,
      recurringMode: "completedAt" as const,
      completedAt: undefined,
    };

    const nextTask = generateNextTaskInstance(taskWithoutCompletedAt);

    expect(nextTask).not.toBeNull();
    if (nextTask) {
      // Should fallback to due date calculation
      expect(nextTask.dueDate).toEqual(new Date("2024-01-22T14:00:00.000Z"));
    }
  });

  it("should work with daily recurring pattern using completion date", () => {
    const dailyTask = {
      ...baseTask,
      recurring: "RRULE:FREQ=DAILY",
      recurringMode: "completedAt" as const,
      dueDate: new Date("2024-01-15T09:00:00.000Z"), // Monday 9 AM
      completedAt: new Date("2024-01-16T14:30:00.000Z"), // Tuesday 2:30 PM
    };

    const nextTask = generateNextTaskInstance(dailyTask);

    expect(nextTask).not.toBeNull();
    if (nextTask) {
      // Should calculate from completion date: Tuesday + 1 day = Wednesday 2:30 PM
      expect(nextTask.dueDate).toEqual(new Date("2024-01-17T14:30:00.000Z"));
    }
  });

  it("should work with monthly recurring pattern using completion date", () => {
    const monthlyTask = {
      ...baseTask,
      recurring: "RRULE:FREQ=MONTHLY",
      recurringMode: "completedAt" as const,
      dueDate: new Date("2024-01-31T10:00:00.000Z"), // January 31st
      completedAt: new Date("2024-02-05T15:45:00.000Z"), // February 5th
    };

    const nextTask = generateNextTaskInstance(monthlyTask);

    expect(nextTask).not.toBeNull();
    if (nextTask) {
      // Should calculate from completion date: February 5th + 1 month = March 5th
      expect(nextTask.dueDate).toEqual(new Date("2024-03-05T15:45:00.000Z"));
    }
  });

  it("should preserve recurringMode in the new task instance", () => {
    const taskWithMode = {
      ...baseTask,
      recurringMode: "completedAt" as const,
    };

    const nextTask = generateNextTaskInstance(taskWithMode);

    expect(nextTask).not.toBeNull();
    if (nextTask) {
      expect(nextTask.recurringMode).toBe("completedAt");
    }
  });

  it("should preserve recurringMode 'dueDate' in new task", () => {
    const taskWithDueDateMode = {
      ...baseTask,
      recurringMode: "dueDate" as const,
    };

    const nextTask = generateNextTaskInstance(taskWithDueDateMode);

    expect(nextTask).not.toBeNull();
    if (nextTask) {
      expect(nextTask.recurringMode).toBe("dueDate");
    }
  });

  describe("recurringMode completedAt - early completion bug prevention", () => {
    it("should never move schedule backwards when completing early", () => {
      // Bug scenario: Daily task due tomorrow, completed today
      // Without fix: next due = today + 1 day = tomorrow (stuck!)
      // With fix: next due = max(today, tomorrow) + 1 day = day after tomorrow

      const tomorrow = new Date("2024-08-23T09:00:00.000Z");
      const today = new Date("2024-08-22T10:00:00.000Z");
      const dayAfterTomorrow = new Date("2024-08-24T09:00:00.000Z");

      const task: Task = {
        id: createTaskId("550e8400-e29b-41d4-a716-446655440001"),
        title: "Daily workout",
        completed: true,
        completedAt: today, // Completed early (today)
        dueDate: tomorrow, // Originally due tomorrow
        recurring: "RRULE:FREQ=DAILY",
        recurringMode: "completedAt",
        createdAt: new Date("2024-08-20T00:00:00.000Z"),
        priority: 2,
        labels: [],
        projectId: undefined,
        subtasks: [],
        comments: [],
      };

      const nextTask = generateNextTaskInstance(task);

      expect(nextTask).not.toBeNull();
      if (nextTask) {
        // Should advance to day after tomorrow, not get stuck at tomorrow
        expect(nextTask.dueDate).toEqual(dayAfterTomorrow);
        expect(nextTask.completed).toBe(false);
        expect(nextTask.completedAt).toBeUndefined();
        expect(nextTask.recurringMode).toBe("completedAt");
      }
    });

    it("should use completion date when completing on time", () => {
      const today = new Date("2024-08-22T09:00:00.000Z");
      const completionTime = new Date("2024-08-22T10:00:00.000Z"); // Later same day
      const tomorrow = new Date("2024-08-23T10:00:00.000Z"); // Preserves completion time

      const task: Task = {
        id: createTaskId("550e8400-e29b-41d4-a716-446655440001"),
        title: "Daily workout",
        completed: true,
        completedAt: completionTime,
        dueDate: today, // Due today
        recurring: "RRULE:FREQ=DAILY",
        recurringMode: "completedAt",
        createdAt: new Date("2024-08-20T00:00:00.000Z"),
        priority: 2,
        labels: [],
        projectId: undefined,
        subtasks: [],
        comments: [],
      };

      const nextTask = generateNextTaskInstance(task);

      expect(nextTask).not.toBeNull();
      if (nextTask) {
        // Should use completion date as reference (both are same day, so next day)
        expect(nextTask.dueDate).toEqual(tomorrow);
        expect(nextTask.recurringMode).toBe("completedAt");
      }
    });

    it("should use completion date when completing late", () => {
      const yesterday = new Date("2024-08-21T09:00:00.000Z");
      const today = new Date("2024-08-22T10:00:00.000Z");
      const tomorrow = new Date("2024-08-23T10:00:00.000Z"); // Preserves completion time

      const task: Task = {
        id: createTaskId("550e8400-e29b-41d4-a716-446655440001"),
        title: "Daily workout",
        completed: true,
        completedAt: today, // Completed late (today)
        dueDate: yesterday, // Was due yesterday
        recurring: "RRULE:FREQ=DAILY",
        recurringMode: "completedAt",
        createdAt: new Date("2024-08-20T00:00:00.000Z"),
        priority: 2,
        labels: [],
        projectId: undefined,
        subtasks: [],
        comments: [],
      };

      const nextTask = generateNextTaskInstance(task);

      expect(nextTask).not.toBeNull();
      if (nextTask) {
        // Should use completion date (today) as reference → tomorrow
        expect(nextTask.dueDate).toEqual(tomorrow);
        expect(nextTask.recurringMode).toBe("completedAt");
      }
    });

    it("should work correctly with weekly recurring tasks", () => {
      // Weekly task due next Monday, completed this Friday (early completion)
      const nextMonday = new Date("2024-08-26T09:00:00.000Z"); // Monday
      const thisFriday = new Date("2024-08-23T10:00:00.000Z"); // Friday (3 days early)
      const mondayAfterNext = new Date("2024-09-02T09:00:00.000Z"); // Monday + 1 week

      const task: Task = {
        id: createTaskId("550e8400-e29b-41d4-a716-446655440001"),
        title: "Weekly report",
        completed: true,
        completedAt: thisFriday,
        dueDate: nextMonday,
        recurring: "RRULE:FREQ=WEEKLY",
        recurringMode: "completedAt",
        createdAt: new Date("2024-08-20T00:00:00.000Z"),
        priority: 2,
        labels: [],
        projectId: undefined,
        subtasks: [],
        comments: [],
      };

      const nextTask = generateNextTaskInstance(task);

      expect(nextTask).not.toBeNull();
      if (nextTask) {
        // Should use max(Friday, Monday) = Monday as reference → Monday + 1 week
        expect(nextTask.dueDate).toEqual(mondayAfterNext);
        expect(nextTask.recurringMode).toBe("completedAt");
      }
    });
  });
});
