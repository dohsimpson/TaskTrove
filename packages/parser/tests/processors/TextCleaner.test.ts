import { describe, it, expect } from "vitest";
import { TextCleaner } from "../../src/processors/TextCleaner";
import type { ParserContext, ExtractionResult } from "../../src/types";

describe("TextCleaner", () => {
  const processor = new TextCleaner();
  const context: ParserContext = {
    locale: "en",
    referenceDate: new Date(),
  };

  it("should remove priority patterns from title", () => {
    const results: ExtractionResult[] = [
      {
        type: "priority",
        value: 1,
        match: "p1",
        startIndex: 10,
        endIndex: 12,
      },
    ];

    const processed = processor.process(results, context);

    expect(processed).toEqual([]);
  });

  it("should remove project tags from title", () => {
    const results: ExtractionResult[] = [
      {
        type: "project",
        value: "groceries",
        match: "#groceries",
        startIndex: 10,
        endIndex: 20,
      },
    ];

    const processed = processor.process(results, context);

    expect(processed).toEqual([]);
  });

  it("should remove label tags from title", () => {
    const results: ExtractionResult[] = [
      {
        type: "label",
        value: "urgent",
        match: "@urgent",
        startIndex: 5,
        endIndex: 12,
      },
      {
        type: "label",
        value: "work",
        match: "@work",
        startIndex: 13,
        endIndex: 17,
      },
    ];

    const processed = processor.process(results, context);

    expect(processed).toEqual([]);
  });

  it("should remove time patterns from title", () => {
    const results: ExtractionResult[] = [
      {
        type: "time",
        value: "15:00",
        match: "3PM",
        startIndex: 15,
        endIndex: 18,
      },
    ];

    const processed = processor.process(results, context);

    expect(processed).toEqual([]);
  });

  it("should remove date patterns from title", () => {
    const results: ExtractionResult[] = [
      {
        type: "date",
        value: new Date(2025, 0, 16),
        match: "tomorrow",
        startIndex: 8,
        endIndex: 15,
      },
    ];

    const processed = processor.process(results, context);

    expect(processed).toEqual([]);
  });

  it("should remove recurring patterns from title", () => {
    const results: ExtractionResult[] = [
      {
        type: "recurring",
        value: "daily",
        match: "every day",
        startIndex: 5,
        endIndex: 14,
      },
    ];

    const processed = processor.process(results, context);

    expect(processed).toEqual([]);
  });

  it("should keep non-extraction results unchanged", () => {
    const results: ExtractionResult[] = [
      {
        type: "priority",
        value: 1,
        match: "p1",
        startIndex: 10,
        endIndex: 12,
      },
      {
        type: "project",
        value: "work",
        match: "#work",
        startIndex: 15,
        endIndex: 20,
      },
    ];

    const processed = processor.process(results, context);

    // Should only keep results that are not date/time/extraction related
    expect(processed).toEqual([]);
  });

  it("should return empty when no results provided", () => {
    const processed = processor.process([], context);

    expect(processed).toEqual([]);
  });

  it("should remove multiple patterns from title", () => {
    const results: ExtractionResult[] = [
      {
        type: "priority",
        value: 1,
        match: "p1",
        startIndex: 5,
        endIndex: 7,
      },
      {
        type: "project",
        value: "work",
        match: "#work",
        startIndex: 8,
        endIndex: 13,
      },
      {
        type: "time",
        value: "14:00",
        match: "2PM",
        startIndex: 14,
        endIndex: 17,
      },
    ];

    const processed = processor.process(results, context);

    expect(processed).toEqual([]);
  });

  it("should preserve other extraction types like estimation", () => {
    const results: ExtractionResult[] = [
      {
        type: "priority",
        value: 1,
        match: "p1",
        startIndex: 10,
        endIndex: 12,
      },
      {
        type: "estimation",
        value: 30,
        match: "~30min",
        startIndex: 15,
        endIndex: 21,
      },
    ];

    const processed = processor.process(results, context);

    // Should keep estimation result, remove priority
    expect(processed).toEqual([
      {
        type: "estimation",
        value: 30,
        match: "~30min",
        startIndex: 15,
        endIndex: 21,
      },
    ]);
  });
});
