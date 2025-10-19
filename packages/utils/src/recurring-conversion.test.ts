import { describe, it, expect } from "vitest";
import { parseEnhancedNaturalLanguage } from "./parser-adapter";

// Note: convertToRRule function was part of the old monolithic parser
// It has been removed as it's now handled by the new parser architecture
// RRULE conversion is now done at the parser level, not as a separate utility

describe("Enhanced Natural Language Parser with RRULE conversion", () => {
  describe("Basic recurring patterns", () => {
    it("should convert daily to RRULE", () => {
      const result = parseEnhancedNaturalLanguage("task daily");
      expect(result.recurring).toBe("RRULE:FREQ=DAILY");
      expect(result.title).toBe("task");
      expect(result.dueDate).toBeUndefined(); // No due date when no time pattern
    });

    it("should convert weekly to RRULE", () => {
      const result = parseEnhancedNaturalLanguage("task weekly");
      expect(result.recurring).toBe("RRULE:FREQ=WEEKLY");
      expect(result.title).toBe("task");
    });

    it("should convert every day to RRULE", () => {
      const result = parseEnhancedNaturalLanguage("task every day");
      expect(result.recurring).toBe("RRULE:FREQ=DAILY");
      expect(result.title).toBe("task");
    });

    it("should convert every monday to RRULE", () => {
      const result = parseEnhancedNaturalLanguage("task every monday");
      expect(result.recurring).toBe("RRULE:FREQ=WEEKLY;BYDAY=MO");
      expect(result.title).toBe("task");
    });

    it("should convert every workday to RRULE", () => {
      const result = parseEnhancedNaturalLanguage("standup every workday");
      expect(result.recurring).toBe("RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR");
      expect(result.title).toBe("standup");
    });
  });

  describe("Dynamic recurring patterns", () => {
    it("should convert every 3 days to RRULE", () => {
      const result = parseEnhancedNaturalLanguage("task every 3 days");
      expect(result.recurring).toBe("RRULE:FREQ=DAILY;INTERVAL=3");
      expect(result.title).toBe("task");
    });

    it("should convert every 2 weeks to RRULE", () => {
      const result = parseEnhancedNaturalLanguage("task every 2 weeks");
      expect(result.recurring).toBe("RRULE:FREQ=WEEKLY;INTERVAL=2");
      expect(result.title).toBe("task");
    });

    it("should convert every 6 months to RRULE", () => {
      const result = parseEnhancedNaturalLanguage("task every 6 months");
      expect(result.recurring).toBe("RRULE:FREQ=MONTHLY;INTERVAL=6");
      expect(result.title).toBe("task");
    });
  });

  describe("Complex scenarios with RRULE conversion", () => {
    it("should convert recurring pattern in complex sentence", () => {
      const result = parseEnhancedNaturalLanguage(
        "important meeting #work @urgent p1 every monday 9AM",
      );

      expect(result.title).toBe("important meeting");
      expect(result.project).toBe("work");
      expect(result.labels).toEqual(["urgent"]);
      expect(result.priority).toBe(1);
      expect(result.time).toBe("09:00");
      expect(result.recurring).toBe("RRULE:FREQ=WEEKLY;BYDAY=MO");
      expect(result.dueDate).toBeDefined(); // Due date when time-only pattern
    });

    it("should take last recurring pattern and convert to RRULE", () => {
      const result = parseEnhancedNaturalLanguage(
        "task daily weekly every friday",
      );
      expect(result.recurring).toBe("RRULE:FREQ=WEEKLY;BYDAY=FR");
      expect(result.title).toBe("task");
    });

    it("should handle disabled recurring sections", () => {
      const disabledSections = new Set(["weekly"]); // This disables the "weekly" part of the captured pattern
      const result = parseEnhancedNaturalLanguage(
        "task daily weekly monthly",
        disabledSections,
      );
      expect(result.recurring).toBe("RRULE:FREQ=MONTHLY");
      expect(result.title).toBe("task weekly"); // "weekly" stays in title since it's disabled, not parsed as recurring
    });
  });

  describe("Phase 3.2: Month Day Patterns", () => {
    it("should convert 'ev 7' to monthly recurrence on day 7", () => {
      const result = parseEnhancedNaturalLanguage("Review ev 7");
      expect(result.recurring).toBe("RRULE:FREQ=MONTHLY;BYMONTHDAY=7");
      expect(result.title).toBe("Review");
    });

    it("should convert 'every 27th' to monthly recurrence on day 27", () => {
      const result = parseEnhancedNaturalLanguage("Pay rent every 27th");
      expect(result.recurring).toBe("RRULE:FREQ=MONTHLY;BYMONTHDAY=27");
      expect(result.title).toBe("Pay rent");
    });

    it("should convert 'ev seventh' to monthly recurrence on day 7", () => {
      const result = parseEnhancedNaturalLanguage("Meeting ev seventh");
      expect(result.recurring).toBe("RRULE:FREQ=MONTHLY;BYMONTHDAY=7");
      expect(result.title).toBe("Meeting");
    });

    it("should convert 'every 1st' to monthly recurrence on day 1", () => {
      const result = parseEnhancedNaturalLanguage("Standup every 1st");
      expect(result.recurring).toBe("RRULE:FREQ=MONTHLY;BYMONTHDAY=1");
      expect(result.title).toBe("Standup");
    });

    it("should convert 'every jan 27th' to yearly recurrence", () => {
      const result = parseEnhancedNaturalLanguage("Review every jan 27th");
      expect(result.recurring).toBe(
        "RRULE:FREQ=YEARLY;BYMONTH=1;BYMONTHDAY=27",
      );
      expect(result.title).toBe("Review");
    });

    it("should convert 'every december 25th' to yearly recurrence", () => {
      const result = parseEnhancedNaturalLanguage(
        "Christmas every december 25th",
      );
      expect(result.recurring).toBe(
        "RRULE:FREQ=YEARLY;BYMONTH=12;BYMONTHDAY=25",
      );
      expect(result.title).toBe("Christmas");
    });

    it("should convert 'ev may 15' to yearly recurrence", () => {
      const result = parseEnhancedNaturalLanguage("Tax deadline ev may 15");
      expect(result.recurring).toBe(
        "RRULE:FREQ=YEARLY;BYMONTH=5;BYMONTHDAY=15",
      );
      expect(result.title).toBe("Tax deadline");
    });
  });

  describe("Integration with existing functionality", () => {
    it("should work with all other parsing features", () => {
      const result = parseEnhancedNaturalLanguage(
        "urgent task #personal @urgent @work p1 every workday at 9AM for 1h",
      );

      expect(result.title).toBe("urgent task");
      expect(result.project).toBe("personal");
      expect(result.labels).toEqual(["urgent", "work"]);
      expect(result.priority).toBe(1);
      expect(result.time).toBe("09:00");
      expect(result.duration).toBe("1h");
      expect(result.recurring).toBe("RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR");
      expect(result.dueDate).toBeDefined(); // Due date when time-only pattern
    });

    it("should preserve existing behavior for non-recurring tasks", () => {
      const result = parseEnhancedNaturalLanguage(
        "task #work @urgent p1 tomorrow 2PM",
      );

      expect(result.title).toBe("task"); // Dates removed from title
      expect(result.project).toBe("work");
      expect(result.labels).toEqual(["urgent"]);
      expect(result.priority).toBe(1);
      expect(result.time).toBe("14:00");
      expect(result.recurring).toBeUndefined();
      expect(result.dueDate).toBeDefined(); // Due date when no recurring
    });
  });
});
