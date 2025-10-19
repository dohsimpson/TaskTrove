import { describe, it, expect } from "vitest";
import { TaskParser } from "../src/TaskParser";
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
});
