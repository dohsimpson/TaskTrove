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
});
