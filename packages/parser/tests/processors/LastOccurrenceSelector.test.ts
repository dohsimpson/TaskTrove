import { describe, it, expect } from "vitest";
import { LastOccurrenceSelector } from "../../src/processors/LastOccurrenceSelector";
import type { ParserContext, ExtractionResult } from "../../src/types";

describe("LastOccurrenceSelector", () => {
  const processor = new LastOccurrenceSelector();
  const context: ParserContext = {
    locale: "en",
    referenceDate: new Date(),
  };

  it("should keep only last occurrence of same type", () => {
    const results: ExtractionResult[] = [
      { type: "priority", value: 1, match: "p1", startIndex: 5, endIndex: 7 },
      { type: "priority", value: 2, match: "p2", startIndex: 20, endIndex: 22 },
    ];

    const processed = processor.process(results, context);

    expect(processed).toHaveLength(1);
    expect(processed[0]?.value).toBe(2);
    expect(processed[0]?.match).toBe("p2");
  });

  it("should keep different types unchanged", () => {
    const results: ExtractionResult[] = [
      { type: "priority", value: 1, match: "p1", startIndex: 5, endIndex: 7 },
      {
        type: "project",
        value: "work",
        match: "#work",
        startIndex: 15,
        endIndex: 20,
      },
    ];

    const processed = processor.process(results, context);

    expect(processed).toHaveLength(2);
    const priorityResult = processed.find((r) => r.type === "priority");
    const projectResult = processed.find((r) => r.type === "project");
    expect(priorityResult?.value).toBe(1);
    expect(projectResult?.value).toBe("work");
  });

  it("should handle multiple occurrences of labels", () => {
    const results: ExtractionResult[] = [
      {
        type: "label",
        value: "urgent",
        match: "@urgent",
        startIndex: 0,
        endIndex: 7,
      },
      {
        type: "label",
        value: "work",
        match: "@work",
        startIndex: 10,
        endIndex: 15,
      },
      {
        type: "label",
        value: "today",
        match: "@today",
        startIndex: 20,
        endIndex: 26,
      },
    ];

    const processed = processor.process(results, context);

    // Labels should support multiple occurrences - keep all in order
    expect(processed).toHaveLength(3);
    expect(processed[0]?.value).toBe("urgent");
    expect(processed[1]?.value).toBe("work");
    expect(processed[2]?.value).toBe("today");
  });

  it("should preserve order when keeping different types", () => {
    const results: ExtractionResult[] = [
      { type: "priority", value: 1, match: "p1", startIndex: 0, endIndex: 2 },
      {
        type: "project",
        value: "home",
        match: "#home",
        startIndex: 5,
        endIndex: 10,
      },
      {
        type: "label",
        value: "personal",
        match: "@personal",
        startIndex: 15,
        endIndex: 24,
      },
    ];

    const processed = processor.process(results, context);

    expect(processed).toHaveLength(3);
    expect(processed[0]?.type).toBe("priority");
    expect(processed[1]?.type).toBe("project");
    expect(processed[2]?.type).toBe("label");
  });
});
