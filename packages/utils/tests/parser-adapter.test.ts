import { describe, it, expect } from "vitest";
import { parseEnhancedNaturalLanguage } from "../src/parser-adapter";

describe("parser-adapter backwards compatibility", () => {
  it("should parse priority and project", () => {
    const result = parseEnhancedNaturalLanguage("Buy milk p1 #groceries");

    expect(result.title).toBe("Buy milk");
    expect(result.priority).toBe(1);
    expect(result.project).toBe("groceries");
  });

  it("should handle disabled sections", () => {
    const result = parseEnhancedNaturalLanguage(
      "Task p1 #work",
      new Set(["p1"]),
    );

    expect(result.priority).toBeUndefined();
    expect(result.project).toBe("work");
  });

  it("should handle config for projects/labels", () => {
    const result = parseEnhancedNaturalLanguage(
      "Meeting #Work Tasks",
      new Set(),
      { projects: [{ name: "Work Tasks" }] },
    );

    expect(result.project).toBe("Work Tasks");
  });

  it("should parse date and time", () => {
    const result = parseEnhancedNaturalLanguage("Meeting tomorrow at 3PM");

    expect(result.title).toBe("Meeting tomorrow"); // dates remain for readability
    expect(result.time).toBe("15:00"); // converted to 24h format
    expect(result.dueDate).toBeInstanceOf(Date);
  });

  it("should parse multiple labels", () => {
    const result = parseEnhancedNaturalLanguage("Task @work @urgent");

    // Multiple labels are supported and preserved in order
    expect(result.labels).toEqual(["work", "urgent"]);
  });

  it("should parse estimation", () => {
    const result = parseEnhancedNaturalLanguage("Task ~30min");

    // Estimation now returns seconds, not minutes
    expect(result.estimation).toBe(30 * 60); // 30 minutes = 1800 seconds
  });
});
