import { describe, it, expect } from "vitest";
import { TaskParser } from "../../src/core/parser";
import { addDays, addWeeks, addMonths, addYears } from "date-fns";
import type { ParserContext } from "../../src/types";

describe("Duration Date Integration", () => {
  const parser = new TaskParser();
  const referenceDate = new Date(2025, 0, 15); // Jan 15, 2025
  const context: ParserContext = {
    locale: "en",
    referenceDate,
  };

  describe("Days patterns", () => {
    it("should set dueDate for 'in 3d' pattern", () => {
      const result = parser.parse("Review in 3d", context);

      expect(result.parsed.title).toBe("Review");
      expect(result.parsed.dueDate).toEqual(addDays(referenceDate, 3));
      expect(result.parsed.time).toBeUndefined(); // No time should be set
    });

    it("should set dueDate for 'in 1 day' pattern", () => {
      const result = parser.parse("Call in 1 day", context);

      expect(result.parsed.title).toBe("Call");
      expect(result.parsed.dueDate).toEqual(addDays(referenceDate, 1));
    });

    it("should set dueDate for 'in 2 days' pattern", () => {
      const result = parser.parse("Meeting in 2 days", context);

      expect(result.parsed.title).toBe("Meeting");
      expect(result.parsed.dueDate).toEqual(addDays(referenceDate, 2));
    });
  });

  describe("Weeks patterns", () => {
    it("should set dueDate for 'in 1w' pattern", () => {
      const result = parser.parse("Deadline in 1w", context);

      expect(result.parsed.title).toBe("Deadline");
      expect(result.parsed.dueDate).toEqual(addWeeks(referenceDate, 1));
    });

    it("should set dueDate for 'in 2 weeks' pattern", () => {
      const result = parser.parse("Project in 2 weeks", context);

      expect(result.parsed.title).toBe("Project");
      expect(result.parsed.dueDate).toEqual(addWeeks(referenceDate, 2));
    });
  });

  describe("Months patterns", () => {
    it("should set dueDate for 'in 2mo' pattern", () => {
      const result = parser.parse("Release in 2mo", context);

      expect(result.parsed.title).toBe("Release");
      expect(result.parsed.dueDate).toEqual(addMonths(referenceDate, 2));
    });

    it("should set dueDate for 'in 1 month' pattern", () => {
      const result = parser.parse("Review in 1 month", context);

      expect(result.parsed.title).toBe("Review");
      expect(result.parsed.dueDate).toEqual(addMonths(referenceDate, 1));
    });
  });

  describe("Years patterns", () => {
    it("should set dueDate for 'in 1y' pattern", () => {
      const result = parser.parse("Anniversary in 1y", context);

      expect(result.parsed.title).toBe("Anniversary");
      expect(result.parsed.dueDate).toEqual(addYears(referenceDate, 1));
    });

    it("should set dueDate for 'in 2 years' pattern", () => {
      const result = parser.parse("Goal in 2 years", context);

      expect(result.parsed.title).toBe("Goal");
      expect(result.parsed.dueDate).toEqual(addYears(referenceDate, 2));
    });
  });

  describe("Mixed with other patterns", () => {
    it("should set dueDate and priority together", () => {
      const result = parser.parse("Important meeting in 3d p1", context);

      expect(result.parsed.title).toBe("Important meeting");
      expect(result.parsed.dueDate).toEqual(addDays(referenceDate, 3));
      expect(result.parsed.priority).toBe(1);
    });

    it("should set dueDate and project together", () => {
      const result = parser.parse("Work task in 1w #project", context);

      expect(result.parsed.title).toBe("Work task");
      expect(result.parsed.dueDate).toEqual(addWeeks(referenceDate, 1));
      expect(result.parsed.project).toBe("project");
    });

    it("should set dueDate and time together", () => {
      const result = parser.parse("Meeting in 2d at 3PM", context);

      expect(result.parsed.title).toBe("Meeting");
      expect(result.parsed.dueDate).toEqual(addDays(referenceDate, 2));
      expect(result.parsed.time).toBe("15:00");
    });

    it("should handle multiple duration dates with last occurrence", () => {
      const result = parser.parse("Task in 1d and then in 1w", context);

      expect(result.parsed.title).toBe("Task and then");
      expect(result.parsed.dueDate).toEqual(addWeeks(referenceDate, 1)); // Should use last occurrence
    });
  });

  describe("Time patterns should still work", () => {
    it("should still extract 'in 5min' as date", () => {
      const result = parser.parse("Quick task in 5min", context);

      expect(result.parsed.title).toBe("Quick task");
      expect(result.parsed.dueDate).toBeInstanceOf(Date); // Should have dueDate for time patterns
      expect(result.parsed.time).toBe("00:05"); // Should extract time from 5 minutes
    });

    it("should still extract 'in 2h' as date", () => {
      const result = parser.parse("Meeting in 2h", context);

      expect(result.parsed.title).toBe("Meeting");
      expect(result.parsed.dueDate).toBeInstanceOf(Date); // Should have dueDate for time patterns
      expect(result.parsed.time).toBe("02:00"); // Should extract time from 2 hours
    });
  });
});
