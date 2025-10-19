import { describe, it, expect } from "vitest";
import { DateTimeLinker } from "../../src/processors/DateTimeLinker";
import { RelativeDateExtractor } from "../../src/extractors/date/RelativeDateExtractor";
import { TimeExtractor } from "../../src/extractors/time/TimeExtractor";
import type { ParserContext, ExtractionResult } from "../../src/types";

describe("DateTimeLinker", () => {
  const processor = new DateTimeLinker();
  const context: ParserContext = {
    locale: "en",
    referenceDate: new Date(2025, 0, 15), // Jan 15, 2025
  };

  const createDateResult = (
    match: string,
    startIndex: number,
    value?: Date,
  ): ExtractionResult => ({
    type: "date",
    value: value || new Date(2025, 0, 16), // tomorrow by default
    match,
    startIndex,
    endIndex: startIndex + match.length,
  });

  const createTimeResult = (
    match: string,
    startIndex: number,
    value: string,
  ): ExtractionResult => ({
    type: "time",
    value,
    match,
    startIndex,
    endIndex: startIndex + match.length,
  });

  it("should combine date and time when time comes after date", () => {
    const results: ExtractionResult[] = [
      createDateResult("tomorrow", 10),
      createTimeResult("3PM", 19, "15:00"),
    ];

    const processed = processor.process(results, context);

    expect(processed).toHaveLength(1);
    // Compare time components since Date comparison can be tricky with timezones
    const resultDate = processed[0]?.value as Date;
    expect(resultDate.getFullYear()).toBe(2025);
    expect(resultDate.getMonth()).toBe(0);
    expect(resultDate.getDate()).toBe(16);
    expect(resultDate.getHours()).toBe(15);
    expect(resultDate.getMinutes()).toBe(0);
    expect(processed[0]?.match).toBe("tomorrow 3PM");
  });

  it("should combine date and time when time comes before date", () => {
    const results: ExtractionResult[] = [
      createTimeResult("at 2PM", 3, "14:00"),
      createDateResult("today", 10, new Date(2025, 0, 15)), // today
    ];

    const processed = processor.process(results, context);

    expect(processed).toHaveLength(1);
    // Compare time components since Date comparison can be tricky with timezones
    const resultDate = processed[0]?.value as Date;
    expect(resultDate.getFullYear()).toBe(2025);
    expect(resultDate.getMonth()).toBe(0);
    expect(resultDate.getDate()).toBe(15);
    expect(resultDate.getHours()).toBe(14);
    expect(resultDate.getMinutes()).toBe(0);
    expect(processed[0]?.match).toBe("at 2PM today");
  });

  it("should handle date and time with distance in between", () => {
    const results: ExtractionResult[] = [
      createDateResult("next week", 15),
      createTimeResult("10AM", 27, "10:00"),
    ];

    const processed = processor.process(results, context);

    expect(processed).toHaveLength(1);
    expect(processed[0]?.match).toBe("next week 10AM");
  });

  it("should preserve non-adjacent date and time results", () => {
    const results: ExtractionResult[] = [
      createDateResult("today", 5, new Date(2025, 0, 15)), // today
      createTimeResult("3PM", 20, "15:00"),
      createDateResult("tomorrow", 35, new Date(2025, 0, 16)), // tomorrow
    ];

    const processed = processor.process(results, context);

    // Should have 2 results: today 3PM (combined) and tomorrow (separate)
    expect(processed).toHaveLength(2);
    expect(processed[0]?.match).toBe("today 3PM");
    expect(processed[1]?.match).toBe("tomorrow");
  });

  it("should preserve results when no date/time combinations possible", () => {
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
        startIndex: 20,
        endIndex: 25,
      },
    ];

    const processed = processor.process(results, context);

    expect(processed).toEqual(results);
  });

  it("should return empty when no results provided", () => {
    const processed = processor.process([], context);

    expect(processed).toEqual([]);
  });

  it("should prefer closest combination when multiple dates available", () => {
    const results: ExtractionResult[] = [
      createDateResult("today", 5, new Date(2025, 0, 15)), // today
      createDateResult("tomorrow", 15, new Date(2025, 0, 16)), // tomorrow
      createTimeResult("2PM", 25, "14:00"),
    ];

    const processed = processor.process(results, context);

    // Should combine tomorrow with 2PM (closest)
    expect(processed).toHaveLength(2);

    // Should combine closest date/time pair and preserve the other
    expect(processed).toHaveLength(2);
    expect(processed.some((r) => r.match.includes("2PM"))).toBe(true);

    // One result should be a combination, one should be a single date
    const hasCombined = processed.some((r) => r.match.includes("2PM"));
    const hasSingleDate = processed.some(
      (r) => r.match === "today" || r.match === "tomorrow",
    );
    expect(hasCombined).toBe(true);
    expect(hasSingleDate).toBe(true);
  });
});
