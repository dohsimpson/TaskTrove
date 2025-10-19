import { describe, it, expect } from "vitest";
import { TimeExtractor } from "../../../src/extractors/time/TimeExtractor";
import type { ParserContext } from "../../../src/types";

describe("TimeExtractor", () => {
  const extractor = new TimeExtractor();
  const context: ParserContext = {
    locale: "en",
    referenceDate: new Date(),
  };

  it('should extract "3PM"', () => {
    const results = extractor.extract("Meeting 3PM", context);

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      type: "time",
      value: "15:00",
      match: "3PM",
    });
  });

  it('should extract "10AM"', () => {
    const results = extractor.extract("Call 10AM", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toBe("10:00");
  });

  it('should extract "12PM"', () => {
    const results = extractor.extract("Lunch 12PM", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toBe("12:00");
  });

  it('should extract "12AM" separately from other text', () => {
    const results = extractor.extract("Call 12AM", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toBe("00:00");
    expect(results[0]?.match).toBe("12AM");
  });

  it('should extract "14:00" (24-hour format)', () => {
    const results = extractor.extract("Train 14:00", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toBe("14:00");
  });

  it('should extract "9:30AM"', () => {
    const results = extractor.extract("Breakfast 9:30AM", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toBe("09:30");
  });

  it('should extract "23:45" (24-hour with minutes)', () => {
    const results = extractor.extract("Late meeting 23:45", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toBe("23:45");
  });

  it('should extract "at 5PM"', () => {
    const results = extractor.extract("Dinner at 5PM", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toBe("17:00");
    expect(results[0]?.match).toBe("at 5PM");
  });

  it('should extract "at 9:15 AM"', () => {
    const results = extractor.extract("Appointment at 9:15 AM", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toBe("09:15");
  });

  it('should extract "8PM" from text with multiple words', () => {
    const results = extractor.extract("Team standup 8PM daily", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toBe("20:00");
  });

  it('should handle "noon" as 12:00 PM', () => {
    const results = extractor.extract("Meeting noon", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toBe("12:00");
  });

  it('should handle "midnight" as 00:00', () => {
    const results = extractor.extract("Call midnight", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toBe("00:00");
  });

  it("should return empty array when no time found", () => {
    const results = extractor.extract("Just a task", context);

    expect(results).toEqual([]);
  });

  it("should respect disabled sections", () => {
    const context: ParserContext = {
      locale: "en",
      referenceDate: new Date(),
      disabledSections: new Set(["3pm"]),
    };

    const results = extractor.extract("Meeting 3PM", context);

    expect(results).toEqual([]);
  });
});
