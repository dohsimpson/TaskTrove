import { describe, it, expect } from "vitest";
import { LastOccurrenceSelector } from "../src/processors/LastOccurrenceSelector";
import type { ExtractionResult, ParserContext } from "../src/types";

describe("LastOccurrenceSelector - Duplicate Handling", () => {
  const processor = new LastOccurrenceSelector();
  const context: ParserContext = {
    locale: "en",
    referenceDate: new Date(),
  };

  it("should deduplicate identical label values while keeping last occurrence", () => {
    const results: ExtractionResult[] = [
      {
        type: "label",
        value: "tag1",
        match: "@tag1",
        startIndex: 0,
        endIndex: 5,
      },
      {
        type: "label",
        value: "tag1",
        match: "@tag1",
        startIndex: 6,
        endIndex: 11,
      },
    ];

    const processed = processor.process(results, context);

    // Should deduplicate identical labels, keeping only one
    expect(processed).toHaveLength(1);
    expect(processed[0]?.value).toBe("tag1");
    expect(processed[0]?.startIndex).toBe(6); // Last occurrence
  });

  it("should keep different labels while deduplicating duplicates", () => {
    const results: ExtractionResult[] = [
      {
        type: "label",
        value: "tag1",
        match: "@tag1",
        startIndex: 0,
        endIndex: 5,
      },
      {
        type: "label",
        value: "tag2",
        match: "@tag2",
        startIndex: 6,
        endIndex: 11,
      },
      {
        type: "label",
        value: "tag1",
        match: "@tag1",
        startIndex: 12,
        endIndex: 17,
      },
    ];

    const processed = processor.process(results, context);

    // Should keep both unique labels, with last occurrence of tag1
    expect(processed).toHaveLength(2);
    const labelValues = processed.map((r) => r.value);
    expect(labelValues).toContain("tag1");
    expect(labelValues).toContain("tag2");
  });

  it("should keep last occurrence for priority", () => {
    const results: ExtractionResult[] = [
      {
        type: "priority",
        value: 3,
        match: "p3",
        startIndex: 0,
        endIndex: 2,
      },
      {
        type: "priority",
        value: 1,
        match: "p1",
        startIndex: 10,
        endIndex: 12,
      },
    ];

    const processed = processor.process(results, context);

    // Should keep only last occurrence for single-occurrence types
    expect(processed).toHaveLength(1);
    expect(processed[0]?.value).toBe(1);
  });
});
