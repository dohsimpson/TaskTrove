import { describe, it, expect } from "vitest";

describe("ParserResult types", () => {
  it("should export ExtractionResult type", () => {
    const result: ExtractionResult = {
      type: "priority",
      value: 1,
      match: "p1",
      startIndex: 10,
      endIndex: 12,
    };

    expect(result.type).toBe("priority");
    expect(result.value).toBe(1);
  });

  it("should export ParsedTask type", () => {
    const parsed: ParsedTask = {
      title: "Test task",
      labels: [],
      originalText: "Test task",
    };

    expect(parsed.title).toBe("Test task");
  });
});
