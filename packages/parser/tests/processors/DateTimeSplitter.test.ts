import { describe, it, expect } from "vitest";
import { DateTimeSplitter } from "../../src/processors/DateTimeSplitter";
import type { ParserContext, ExtractionResult } from "../../src/types";

describe("DateTimeSplitter", () => {
  const processor = new DateTimeSplitter();
  const context: ParserContext = {
    locale: "en",
    referenceDate: new Date(2025, 0, 15, 10, 30, 0), // Jan 15, 2025 10:30 AM
  };

  it("should split time pattern datetime into separate date and time", () => {
    const dateValue = new Date(2025, 0, 15, 10, 35, 0); // 10:35 AM
    const results: ExtractionResult[] = [
      {
        type: "date",
        value: dateValue,
        match: "in 5min",
        startIndex: 10,
        endIndex: 17,
      },
    ];

    const processed = processor.process(results, context);

    expect(processed).toHaveLength(2);

    const dateResult = processed.find((r) => r.type === "date");
    const timeResult = processed.find((r) => r.type === "time");

    expect(dateResult).toMatchObject({
      type: "date",
      match: "in 5min",
      startIndex: 10,
      endIndex: 17,
    });
    expect(dateResult?.value).toEqual(new Date(2025, 0, 15)); // Midnight

    expect(timeResult).toMatchObject({
      type: "time",
      value: "10:35",
      match: "in 5min",
      startIndex: 10,
      endIndex: 17,
    });
  });

  it("should not split duration patterns (in 3d)", () => {
    const dateValue = new Date(2025, 0, 18); // Jan 18, 2025 (midnight)
    const results: ExtractionResult[] = [
      {
        type: "date",
        value: dateValue,
        match: "in 3d",
        startIndex: 10,
        endIndex: 15,
      },
    ];

    const processed = processor.process(results, context);

    expect(processed).toHaveLength(1);
    expect(processed[0]).toMatchObject({
      type: "date",
      value: dateValue,
      match: "in 3d",
    });
  });

  it("should not split when explicit time already exists", () => {
    const dateValue = new Date(2025, 0, 15, 10, 35, 0); // 10:35 AM
    const results: ExtractionResult[] = [
      {
        type: "date",
        value: dateValue,
        match: "in 5min",
        startIndex: 10,
        endIndex: 17,
      },
      {
        type: "time",
        value: "15:00",
        match: "at 3PM",
        startIndex: 20,
        endIndex: 26,
      },
    ];

    const processed = processor.process(results, context);

    expect(processed).toHaveLength(2);
    expect(processed.find((r) => r.type === "date")).toMatchObject({
      type: "date",
      value: dateValue,
      match: "in 5min",
    });
    expect(processed.find((r) => r.type === "time")).toMatchObject({
      type: "time",
      value: "15:00",
      match: "at 3PM",
    });
  });

  it("should not split midnight times", () => {
    const dateValue = new Date(2025, 0, 15, 0, 0, 0); // Midnight
    const results: ExtractionResult[] = [
      {
        type: "date",
        value: dateValue,
        match: "in 5min",
        startIndex: 10,
        endIndex: 17,
      },
    ];

    const processed = processor.process(results, context);

    expect(processed).toHaveLength(1);
    expect(processed[0]).toMatchObject({
      type: "date",
      value: dateValue,
      match: "in 5min",
    });
  });

  it("should handle hours and minutes pattern", () => {
    const dateValue = new Date(2025, 0, 15, 12, 45, 0); // 12:45 PM
    const results: ExtractionResult[] = [
      {
        type: "date",
        value: dateValue,
        match: "in 2h 15m",
        startIndex: 10,
        endIndex: 19,
      },
    ];

    const processed = processor.process(results, context);

    expect(processed).toHaveLength(2);

    const timeResult = processed.find((r) => r.type === "time");
    expect(timeResult?.value).toBe("12:45");
  });

  it("should preserve non-datetime results", () => {
    const results: ExtractionResult[] = [
      {
        type: "priority",
        value: 1,
        match: "p1",
        startIndex: 0,
        endIndex: 2,
      },
      {
        type: "project",
        value: "work",
        match: "#work",
        startIndex: 5,
        endIndex: 10,
      },
    ];

    const processed = processor.process(results, context);

    expect(processed).toEqual(results);
  });
});
