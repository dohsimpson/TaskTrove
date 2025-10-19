import { describe, it, expect } from "vitest";
import { TimeToDateProcessor } from "../../src/processors/TimeToDateProcessor";
import { startOfDay } from "date-fns";
import type { ParserContext, ExtractionResult } from "../../src/types";

describe("TimeToDateProcessor", () => {
  const processor = new TimeToDateProcessor();
  const context: ParserContext = {
    locale: "en",
    referenceDate: new Date(2025, 0, 15, 10, 30, 0), // Jan 15, 2025 10:30 AM
  };

  it("should create today's date for explicit time patterns", () => {
    const results: ExtractionResult[] = [
      {
        type: "time",
        value: "15:00",
        match: "at 3PM",
        startIndex: 10,
        endIndex: 16,
      },
    ];

    const processed = processor.process(results, context);

    expect(processed).toHaveLength(2);

    const dateResult = processed.find((r) => r.type === "date");
    const timeResult = processed.find((r) => r.type === "time");

    expect(dateResult).toMatchObject({
      type: "date",
      value: startOfDay(context.referenceDate),
      match: "",
      startIndex: -1,
      endIndex: -1,
    });

    expect(timeResult).toMatchObject({
      type: "time",
      value: "15:00",
      match: "at 3PM",
      startIndex: 10,
      endIndex: 16,
    });
  });

  it("should not create date when duration patterns exist", () => {
    const results: ExtractionResult[] = [
      {
        type: "date",
        value: new Date(2025, 0, 15, 15, 35, 0), // "in 5min"
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

    expect(processed).toEqual(results);
  });

  it("should not create date when date already exists", () => {
    const results: ExtractionResult[] = [
      {
        type: "date",
        value: new Date(2025, 0, 16), // "tomorrow"
        match: "tomorrow",
        startIndex: 10,
        endIndex: 17,
      },
      {
        type: "time",
        value: "15:00",
        match: "at 3PM",
        startIndex: 25,
        endIndex: 31,
      },
    ];

    const processed = processor.process(results, context);

    expect(processed).toEqual(results);
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
        endInex: 10,
      },
    ];

    const processed = processor.process(results, context);

    expect(processed).toEqual(results);
  });

  it("should not create date for duration patterns only", () => {
    const results: ExtractionResult[] = [
      {
        type: "date",
        value: new Date(2025, 0, 18, 15, 35, 0), // "in 3d"
        match: "in 3d",
        startIndex: 10,
        endIndex: 14,
      },
    ];

    const processed = processor.process(results, context);

    expect(processed).toEqual(results);
  });

  it("should work with mixed time and duration patterns", () => {
    const results: ExtractionResult[] = [
      {
        type: "date",
        value: new Date(2025, 0, 15, 15, 35, 0), // "in 5min"
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
      {
        type: "project",
        value: "work",
        match: "#work",
        startIndex: 30,
        endIndex: 35,
      },
    ];

    const processed = processor.process(results, context);

    // Should not create date due to existing date
    expect(processed).toHaveLength(3);
    expect(processed.find((r) => r.type === "date")).toBeTruthy();
    expect(processed.find((r) => r.type === "time")).toBeTruthy();
    expect(processed.find((r) => r.type === "project")).toBeTruthy();
  });
});
