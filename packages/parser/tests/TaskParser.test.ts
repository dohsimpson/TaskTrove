import { describe, it, expect } from "vitest";
import { TaskParser } from "../src/TaskParser";
import { RecurringExtractor } from "../src/extractors/recurring/RecurringExtractor";
import type { ParserContext } from "../src/types";

describe("TaskParser", () => {
  it("should extract priority and project from simple task", () => {
    const parser = new TaskParser();
    const context: ParserContext = {
      locale: "en",
      referenceDate: new Date(),
    };

    const result = parser.parse("Buy milk p1 #groceries", context);

    expect(result.parsed.title).toBe("Buy milk");
    expect(result.parsed.priority).toBe(1);
    expect(result.parsed.project).toBe("groceries");
  });

  it("should handle multiple exclamation patterns", () => {
    const parser = new TaskParser();
    const context: ParserContext = {
      locale: "en",
      referenceDate: new Date(),
    };

    const result = parser.parse("Meeting !!! today", context);

    expect(result.parsed.title).toBe("Meeting today");
    expect(result.parsed.priority).toBe(1);
  });

  it("should resolve overlaps correctly", () => {
    const parser = new TaskParser();
    const context: ParserContext = {
      locale: "en",
      referenceDate: new Date(),
    };

    const result = parser.parse("Task !!!", context);

    expect(result.parsed.title).toBe("Task");
    expect(result.parsed.priority).toBe(1);
    expect(result.parsed.title).not.toContain("!!!");
  });

  it("should return ParserResult instance", () => {
    const parser = new TaskParser();
    const context: ParserContext = {
      locale: "en",
      referenceDate: new Date(),
    };

    const result = parser.parse("Simple task", context);

    expect(result.parsed.title).toBe("Simple task");
    expect(result.parsed.priority).toBeUndefined();
    expect(result.parsed.labels).toEqual([]);
  });

  it("should extract labels and projects together", () => {
    const parser = new TaskParser();
    const context: ParserContext = {
      locale: "en",
      referenceDate: new Date(),
    };

    const result = parser.parse("Meeting @urgent #work tomorrow", context);

    expect(result.parsed.title).toBe("Meeting tomorrow");
    expect(result.parsed.project).toBe("work");
    expect(result.parsed.labels).toContain("urgent");
  });

  it("should extract time patterns", () => {
    const parser = new TaskParser();
    const context: ParserContext = {
      locale: "en",
      referenceDate: new Date(),
    };

    const result = parser.parse("Meeting at 3PM", context);

    expect(result.parsed.title).toBe("Meeting");
    expect(result.parsed.time).toBe("15:00");
  });

  it("should extract recurring patterns", () => {
    const parser = new TaskParser();
    const context: ParserContext = {
      locale: "en",
      referenceDate: new Date(),
    };

    const result = parser.parse("Team meeting weekly", context);

    expect(result.parsed.title).toBe("Team meeting");
    expect(result.parsed.recurring).toBe("RRULE:FREQ=WEEKLY");
  });

  it("should extract estimation patterns", () => {
    const parser = new TaskParser();
    const context: ParserContext = {
      locale: "en",
      referenceDate: new Date(),
    };

    const result = parser.parse("Code review ~30min", context);

    expect(result.parsed.title).toBe("Code review");
    expect(result.parsed.estimation).toBe(30);
  });

  it("should handle complex task with all pattern types", () => {
    const parser = new TaskParser();
    const referenceDate = new Date(2025, 0, 15); // Jan 15, 2025
    const context: ParserContext = {
      locale: "en",
      referenceDate,
    };

    const result = parser.parse(
      "Important presentation p2 #work @urgent tomorrow at 2PM weekly ~1h",
      context,
    );

    expect(result.parsed.priority).toBe(2);
    expect(result.parsed.project).toBe("work");
    expect(result.parsed.labels).toEqual(["urgent"]);
    expect(result.parsed.time).toBe("14:00");
    expect(result.parsed.recurring).toBe("RRULE:FREQ=WEEKLY");
    expect(result.parsed.estimation).toBe(60);
    expect(result.parsed.dueDate).toBeDefined();
    expect(result.parsed.title).toBe("Important presentation tomorrow"); // dates remain
  });
});
