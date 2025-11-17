import { describe, it, expect } from "vitest";
import { parseEnhancedNaturalLanguage } from "./parser-adapter";
import {
  calculateNextDueDate,
  dateMatchesRecurringPattern,
  processRecurringTaskCompletion,
} from "./recurring-task-processor";
import type { Task } from "@tasktrove/types/core";
import { createTaskId } from "@tasktrove/types/id";

// Note: convertToRRule function was part of the old monolithic parser
// It has been removed as it's now handled by the new parser architecture
// RRULE conversion is now done at the parser level, not as a separate utility

describe("Enhanced Natural Language Parser with RRULE conversion", () => {
  describe("Basic recurring patterns", () => {
    it("should convert daily to RRULE", () => {
      const result = parseEnhancedNaturalLanguage("task daily");
      expect(result.recurring).toBe("RRULE:FREQ=DAILY");
      expect(result.title).toBe("task");
      expect(result.dueDate).toBeInstanceOf(Date); // Auto-enriched with anchor date
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

  describe("Multi-RRULE union support", () => {
    it("parser returns newline-joined RRULEs for paired month/day list", () => {
      const result = parseEnhancedNaturalLanguage(
        "Comms every 14 jan, 14 apr, 15 jun, 15 sep",
      );
      expect(result.recurring).toBe(
        [
          "RRULE:FREQ=YEARLY;BYMONTH=1;BYMONTHDAY=14",
          "RRULE:FREQ=YEARLY;BYMONTH=4;BYMONTHDAY=14",
          "RRULE:FREQ=YEARLY;BYMONTH=6;BYMONTHDAY=15",
          "RRULE:FREQ=YEARLY;BYMONTH=9;BYMONTHDAY=15",
        ].join("\n"),
      );
    });

    it("dateMatchesRecurringPattern OR-matches across lines", () => {
      const union = [
        "RRULE:FREQ=YEARLY;BYMONTH=1;BYMONTHDAY=14",
        "RRULE:FREQ=YEARLY;BYMONTH=4;BYMONTHDAY=14",
        "RRULE:FREQ=YEARLY;BYMONTH=6;BYMONTHDAY=15",
        "RRULE:FREQ=YEARLY;BYMONTH=9;BYMONTHDAY=15",
      ].join("\n");
      const ref = new Date("2025-01-01T00:00:00Z");
      expect(
        dateMatchesRecurringPattern(
          new Date("2025-01-14T00:00:00Z"),
          union,
          ref,
        ),
      ).toBe(true);
      expect(
        dateMatchesRecurringPattern(
          new Date("2025-01-15T00:00:00Z"),
          union,
          ref,
        ),
      ).toBe(false);
    });

    it("calculateNextDueDate picks the earliest across lines", () => {
      const union = [
        "RRULE:FREQ=YEARLY;BYMONTH=1;BYMONTHDAY=14",
        "RRULE:FREQ=YEARLY;BYMONTH=4;BYMONTHDAY=14",
        "RRULE:FREQ=YEARLY;BYMONTH=6;BYMONTHDAY=15",
        "RRULE:FREQ=YEARLY;BYMONTH=9;BYMONTHDAY=15",
      ].join("\n");
      const from1 = new Date("2025-01-01T00:00:00Z");
      const next1 = calculateNextDueDate(union, from1, false);
      // For multi-line RRULEs, we clamp to local midnight of intended day
      expect(next1).not.toBeNull();
      if (next1) {
        expect(next1.getFullYear()).toBe(2025);
        expect(next1.getMonth()).toBe(0); // Jan
        expect(next1.getDate()).toBe(14);
        expect(next1.getHours()).toBe(0);
      }

      const from2 = new Date("2025-01-15T00:00:00Z");
      const next2 = calculateNextDueDate(union, from2, false);
      expect(next2).not.toBeNull();
      if (next2) {
        expect(next2.getFullYear()).toBe(2025);
        expect(next2.getMonth()).toBe(3); // Apr
        expect(next2.getDate()).toBe(14);
        expect(next2.getHours()).toBe(0);
      }
    });

    it("generateNextTaskInstance should advance from Sep 15 → Jan 14 (not Jan 13)", () => {
      const union = [
        "RRULE:FREQ=YEARLY;BYMONTH=1;BYMONTHDAY=14",
        "RRULE:FREQ=YEARLY;BYMONTH=4;BYMONTHDAY=14",
        "RRULE:FREQ=YEARLY;BYMONTH=6;BYMONTHDAY=15",
        "RRULE:FREQ=YEARLY;BYMONTH=9;BYMONTHDAY=15",
      ].join("\n");

      const due = new Date(2025, 8, 15, 0, 0, 0, 0); // Sep 15, 2025 local midnight
      const base: Task = {
        id: createTaskId("123e4567-e89b-12d3-a456-426614174000"),
        title: "Test",
        description: undefined,
        completed: true,
        priority: 3,
        dueDate: due,
        dueTime: undefined,
        projectId: undefined,
        labels: [],
        subtasks: [],
        comments: [],
        createdAt: new Date(2025, 0, 1, 12, 0, 0, 0),
        completedAt: new Date(2025, 8, 15, 12, 0, 0, 0), // complete on Sep 15 at noon local
        recurring: union,
        recurringMode: "completedAt",
        estimation: undefined,
        trackingId: undefined,
      };

      const next = processRecurringTaskCompletion(base);
      expect(next).not.toBeNull();
      expect(next?.dueDate).not.toBeNull();
      const d = next?.dueDate;
      // Expect local date to be Jan 14, 2026 (year rolls over after Sep → Jan)
      expect(d?.getFullYear()).toBe(2026);
      expect(d?.getMonth()).toBe(0); // Jan = 0
      expect(d?.getDate()).toBe(14);
    });

    it("sequential completions: Jan 14 → Apr 14 (no phantom Jan 13)", () => {
      const union = [
        "RRULE:FREQ=YEARLY;BYMONTH=1;BYMONTHDAY=14",
        "RRULE:FREQ=YEARLY;BYMONTH=4;BYMONTHDAY=14",
        "RRULE:FREQ=YEARLY;BYMONTH=6;BYMONTHDAY=15",
        "RRULE:FREQ=YEARLY;BYMONTH=9;BYMONTHDAY=15",
      ].join("\n");

      // Start from Jan 14, 2026 local
      const due = new Date(2026, 0, 14, 0, 0, 0, 0);
      const base: Task = {
        id: createTaskId("123e4567-e89b-12d3-a456-426614174001"),
        title: "Test",
        description: undefined,
        completed: true,
        priority: 3,
        dueDate: due,
        dueTime: undefined,
        projectId: undefined,
        labels: [],
        subtasks: [],
        comments: [],
        createdAt: new Date(2025, 0, 1, 12, 0, 0, 0),
        completedAt: new Date(2026, 0, 14, 12, 0, 0, 0), // complete Jan 14 at noon
        recurring: union,
        recurringMode: "completedAt",
        estimation: undefined,
        trackingId: undefined,
      };

      const next = processRecurringTaskCompletion(base);
      expect(next).not.toBeNull();
      expect(next?.dueDate).not.toBeNull();
      const d = next?.dueDate;
      expect(d?.getFullYear()).toBe(2026);
      expect(d?.getMonth()).toBe(3); // April
      expect(d?.getDate()).toBe(14);
    });

    it("guarantees floating local midnight for date-only multi-RRULEs", () => {
      const union = [
        "RRULE:FREQ=YEARLY;BYMONTH=1;BYMONTHDAY=14",
        "RRULE:FREQ=YEARLY;BYMONTH=4;BYMONTHDAY=14",
        "RRULE:FREQ=YEARLY;BYMONTH=6;BYMONTHDAY=15",
        "RRULE:FREQ=YEARLY;BYMONTH=9;BYMONTHDAY=15",
      ].join("\n");

      const from = new Date("2025-01-01T00:00:00Z");
      const n1 = calculateNextDueDate(union, from, false);
      expect(n1).not.toBeNull();
      if (n1) {
        expect(n1.getHours()).toBe(0);
        expect(n1.getMinutes()).toBe(0);
        expect(n1.getSeconds()).toBe(0);

        const n2 = calculateNextDueDate(union, new Date(n1), false);
        expect(n2).not.toBeNull();
        if (n2) {
          expect(n2.getHours()).toBe(0);
          expect(n2.getMinutes()).toBe(0);
          expect(n2.getSeconds()).toBe(0);
        }
      }
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
