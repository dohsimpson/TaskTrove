import { describe, it, expect } from "vitest";
import { TaskParser } from "../../src/TaskParser";
import type { ParserContext } from "../../src/types";

describe("Date Integration", () => {
  it("should parse task with due date", () => {
    const parser = new TaskParser();
    const context: ParserContext = {
      locale: "en",
      referenceDate: new Date(2025, 0, 15), // Jan 15, 2025
    };

    const result = parser.parse("Meeting tomorrow p1", context);

    expect(result.parsed.title).toBe("Meeting tomorrow");
    expect(result.parsed.priority).toBe(1);
    expect(result.parsed.dueDate).toEqual(new Date(2025, 0, 16));
  });
});
