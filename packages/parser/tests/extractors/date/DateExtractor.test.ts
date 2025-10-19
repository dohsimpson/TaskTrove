import { describe, it, expect } from "vitest";
import { DateExtractor } from "../../../src/extractors/date/DateExtractor";
import type { ParserContext } from "../../../src/types";
import { addDays, addMonths, addYears } from "date-fns";

describe("DateExtractor", () => {
  const extractor = new DateExtractor();

  it("should extract today", () => {
    const context: ParserContext = {
      locale: "en",
      referenceDate: new Date(2025, 0, 15), // Jan 15, 2025
    };

    const results = extractor.extract("Task today", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toEqual(new Date(2025, 0, 15));
    expect(results[0]?.match).toBe("today");
  });

  it("should extract tomorrow", () => {
    const context: ParserContext = {
      locale: "en",
      referenceDate: new Date(2025, 0, 15), // Jan 15, 2025
    };

    const results = extractor.extract("Task tomorrow", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toEqual(new Date(2025, 0, 16));
    expect(results[0]?.match).toBe("tomorrow");
  });

  it("should extract yesterday", () => {
    const context: ParserContext = {
      locale: "en",
      referenceDate: new Date(2025, 0, 15), // Jan 15, 2025
    };

    const results = extractor.extract("Task yesterday", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toEqual(new Date(2025, 0, 14));
    expect(results[0]?.match).toBe("yesterday");
  });

  it("should extract relative dates (next week)", () => {
    const context: ParserContext = {
      locale: "en",
      referenceDate: new Date(2025, 0, 15), // Jan 15, 2025
    };

    const results = extractor.extract("Task next week", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.match).toBe("next week");
    expect(results[0]?.value).toBeInstanceOf(Date);
  });

  it("should extract numeric dates (mm/dd)", () => {
    const context: ParserContext = {
      locale: "en",
      referenceDate: new Date(2025, 0, 15), // Jan 15, 2025
    };

    const results = extractor.extract("Task 02/20", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.match).toBe("02/20");
    expect(results[0]?.value).toEqual(new Date(2025, 1, 20)); // Feb 20, 2025
  });

  it("should extract month day patterns", () => {
    const context: ParserContext = {
      locale: "en",
      referenceDate: new Date(2025, 0, 15), // Jan 15, 2025
    };

    const results = extractor.extract("Task March 15", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.match).toBe("March 15");
    expect(results[0]?.value).toEqual(new Date(2025, 2, 15)); // Mar 15, 2025
  });

  it("should return empty array when no date found", () => {
    const context: ParserContext = {
      locale: "en",
      referenceDate: new Date(2025, 0, 15),
    };

    const results = extractor.extract("Just a task", context);

    expect(results).toEqual([]);
  });

  it("should extract 'tod' (shorthand for today)", () => {
    const context: ParserContext = {
      locale: "en",
      referenceDate: new Date(2025, 0, 15), // Jan 15, 2025
    };

    const results = extractor.extract("Task tod", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toEqual(new Date(2025, 0, 15));
    expect(results[0]?.match).toBe("tod");
  });

  it("should extract 'tmr' (shorthand for tomorrow)", () => {
    const context: ParserContext = {
      locale: "en",
      referenceDate: new Date(2025, 0, 15), // Jan 15, 2025
    };

    const results = extractor.extract("Task tmr", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toEqual(new Date(2025, 0, 16));
    expect(results[0]?.match).toBe("tmr");
  });

  it("should extract 'tom' (shorthand for tomorrow)", () => {
    const context: ParserContext = {
      locale: "en",
      referenceDate: new Date(2025, 0, 15), // Jan 15, 2025
    };

    const results = extractor.extract("Task tom", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toEqual(new Date(2025, 0, 16));
    expect(results[0]?.match).toBe("tom");
  });

  it("should extract 'in 2 days'", () => {
    const context: ParserContext = {
      locale: "en",
      referenceDate: new Date(2025, 0, 15), // Jan 15, 2025
    };

    const results = extractor.extract("Task in 2 days", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toEqual(new Date(2025, 0, 17)); // Jan 17, 2025
    expect(results[0]?.match).toBe("in 2 days");
  });

  it("should extract 'in an hour'", () => {
    const context: ParserContext = {
      locale: "en",
      referenceDate: new Date(2025, 0, 15, 10, 30, 0), // Jan 15, 2025 10:30 AM
    };

    const results = extractor.extract("Call in an hour", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toEqual(new Date(2025, 0, 15, 11, 30, 0)); // Jan 15, 2025 11:30 AM
    expect(results[0]?.match).toBe("in an hour");
  });

  it("should extract 'in a week'", () => {
    const context: ParserContext = {
      locale: "en",
      referenceDate: new Date(2025, 0, 15), // Jan 15, 2025
    };

    const results = extractor.extract("Meeting in a week", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toEqual(new Date(2025, 0, 22)); // Jan 22, 2025
    expect(results[0]?.match).toBe("in a week");
  });
});
