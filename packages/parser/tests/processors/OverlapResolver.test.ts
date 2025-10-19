import { describe, it, expect } from "vitest";
import { OverlapResolver } from "../../src/processors/OverlapResolver";
import type { ParserContext, ExtractionResult } from "../../src/types";

describe("OverlapResolver", () => {
  const processor = new OverlapResolver();
  const context: ParserContext = {
    locale: "en",
    referenceDate: new Date(),
  };

  it("should keep longer match when overlapping", () => {
    const results: ExtractionResult[] = [
      { type: "priority", value: 3, match: "!", startIndex: 10, endIndex: 11 },
      {
        type: "priority",
        value: 1,
        match: "!!!",
        startIndex: 10,
        endIndex: 13,
      },
    ];

    const processed = processor.process(results, context);

    expect(processed).toHaveLength(1);
    expect(processed[0]?.match).toBe("!!!");
    expect(processed[0]?.value).toBe(1);
  });

  it("should keep both non-overlapping matches", () => {
    const results: ExtractionResult[] = [
      { type: "priority", value: 1, match: "p1", startIndex: 5, endIndex: 7 },
      { type: "priority", value: 3, match: "!", startIndex: 20, endIndex: 21 },
    ];

    const processed = processor.process(results, context);

    expect(processed).toHaveLength(2);
  });

  it("should handle complex overlaps with !!! and !!", () => {
    const results: ExtractionResult[] = [
      { type: "priority", value: 3, match: "!", startIndex: 10, endIndex: 11 },
      { type: "priority", value: 2, match: "!!", startIndex: 10, endIndex: 12 },
      {
        type: "priority",
        value: 1,
        match: "!!!",
        startIndex: 10,
        endIndex: 13,
      },
    ];

    const processed = processor.process(results, context);

    expect(processed).toHaveLength(1);
    expect(processed[0]?.match).toBe("!!!");
  });

  it("should preserve non-priority results unchanged", () => {
    const results: ExtractionResult[] = [
      {
        type: "project",
        value: "work",
        match: "#work",
        startIndex: 0,
        endIndex: 5,
      },
      {
        type: "priority",
        value: 1,
        match: "!!!",
        startIndex: 10,
        endIndex: 13,
      },
      { type: "priority", value: 3, match: "!", startIndex: 10, endIndex: 11 },
    ];

    const processed = processor.process(results, context);

    expect(processed).toHaveLength(2);
    const projectResult = processed.find((r) => r.type === "project");
    expect(projectResult?.value).toBe("work");
  });
});
