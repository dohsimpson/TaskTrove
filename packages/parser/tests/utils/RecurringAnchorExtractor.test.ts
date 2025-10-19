import { describe, it, expect } from "vitest";
import { extractRecurringAnchor } from "../../src/utils/RecurringAnchorExtractor";

describe("extractRecurringAnchor", () => {
  const referenceDate = new Date(2025, 0, 15); // Jan 15, 2025 (Wednesday)

  it("should extract dueDate for simple daily recurring pattern", () => {
    const result = extractRecurringAnchor("RRULE:FREQ=DAILY", referenceDate);

    expect(result).not.toBeNull();
    expect(result?.dueDate).toEqual(referenceDate);
    expect(result?.time).toBeUndefined();
  });

  it("should extract dueDate and time for recurring pattern with BYHOUR", () => {
    const result = extractRecurringAnchor(
      "RRULE:FREQ=WEEKLY;BYDAY=MO;BYHOUR=15",
      referenceDate,
    );

    expect(result).not.toBeNull();
    expect(result?.time).toBe("15:00:00");
    // Should find next Monday (Jan 20, 2025)
    expect(result?.dueDate.getDate()).toBe(20);
    expect(result?.dueDate.getMonth()).toBe(0); // January
  });

  it("should return null for invalid RRULE", () => {
    const result = extractRecurringAnchor("INVALID", referenceDate);

    expect(result).toBeNull();
  });

  it("should extract first occurrence as dueDate for weekly pattern", () => {
    const result = extractRecurringAnchor(
      "RRULE:FREQ=WEEKLY;BYDAY=FR",
      referenceDate,
    );

    expect(result).not.toBeNull();
    // Should find next Friday (Jan 17, 2025)
    expect(result?.dueDate.getDate()).toBe(17);
    expect(result?.dueDate.getMonth()).toBe(0); // January
  });

  it("should extract first occurrence for monthly pattern with BYMONTHDAY", () => {
    // Reference: Jan 15, 2025
    const result = extractRecurringAnchor(
      "RRULE:FREQ=MONTHLY;BYMONTHDAY=3",
      referenceDate,
    );

    expect(result).not.toBeNull();
    // Should find next 3rd (Feb 3, 2025 since Jan 3 has passed)
    expect(result?.dueDate.getDate()).toBe(3);
    expect(result?.dueDate.getMonth()).toBe(1); // February
    expect(result?.time).toBeUndefined();
  });

  it("should extract current month if BYMONTHDAY hasn't passed", () => {
    // Reference: Jan 15, 2025 - 20th hasn't happened yet
    const result = extractRecurringAnchor(
      "RRULE:FREQ=MONTHLY;BYMONTHDAY=20",
      referenceDate,
    );

    expect(result).not.toBeNull();
    // Should find Jan 20, 2025 (current month)
    expect(result?.dueDate.getDate()).toBe(20);
    expect(result?.dueDate.getMonth()).toBe(0); // January
  });

  it("should handle last day of month (BYMONTHDAY=-1)", () => {
    const result = extractRecurringAnchor(
      "RRULE:FREQ=MONTHLY;BYMONTHDAY=-1",
      referenceDate,
    );

    expect(result).not.toBeNull();
    // Should find last day of January (Jan 31, 2025)
    expect(result?.dueDate.getDate()).toBe(31);
    expect(result?.dueDate.getMonth()).toBe(0); // January
  });
});
