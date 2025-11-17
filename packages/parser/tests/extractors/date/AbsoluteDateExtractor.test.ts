import { describe, it, expect } from "vitest";
import { startOfDay } from "date-fns";
import { AbsoluteDateExtractor } from "../../../src/extractors/date/AbsoluteDateExtractor";
import type { ParserContext } from "../../../src/types";

describe("AbsoluteDateExtractor", () => {
  const extractor = new AbsoluteDateExtractor();
  const referenceDate = new Date(2025, 0, 15); // Jan 15, 2025
  const context: ParserContext = {
    locale: "en",
    referenceDate,
  };

  it("should extract month day format (Jan 15)", () => {
    const results = extractor.extract("Meeting Jan 15", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.type).toBe("date");
    expect(results[0]?.value).toEqual(startOfDay(new Date(2025, 0, 15)));
    expect(results[0]?.match).toBe("Jan 15");
  });

  it("should extract month day format with comma (Jan 15,)", () => {
    const results = extractor.extract("Deadline Jan 15,", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toEqual(startOfDay(new Date(2025, 0, 15)));
  });

  it("should extract day month format (15 Jan)", () => {
    const results = extractor.extract("Start 15 Jan", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toEqual(startOfDay(new Date(2025, 0, 15)));
  });

  it("should extract month day year format (Jan 15 2025)", () => {
    const results = extractor.extract("Event Jan 15 2025", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toEqual(startOfDay(new Date(2025, 0, 15)));
  });

  it("should extract US format (1/15)", () => {
    const results = extractor.extract("Review 1/15", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toEqual(startOfDay(new Date(2025, 0, 15)));
  });

  it("should extract EU format (15/1)", () => {
    const results = extractor.extract("Meeting 15/1", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toEqual(startOfDay(new Date(2025, 0, 15)));
  });

  it("should extract US format with year (1/15/2025)", () => {
    const results = extractor.extract("Start 1/15/2025", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toEqual(startOfDay(new Date(2025, 0, 15)));
  });

  it("should extract EU format with year (15/1/2025)", () => {
    const results = extractor.extract("End 15/1/2025", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toEqual(startOfDay(new Date(2025, 0, 15)));
  });

  it("should extract full month name (January 15)", () => {
    const results = extractor.extract("Launch January 15", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toEqual(startOfDay(new Date(2025, 0, 15)));
  });

  it("should extract ordinal dates (March 3rd)", () => {
    const results = extractor.extract("Birthday March 3rd", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toEqual(startOfDay(new Date(2025, 2, 3)));
  });

  it("should extract ordinal dates with year (March 3rd, 2025)", () => {
    const results = extractor.extract("Anniversary March 3rd, 2025", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toEqual(startOfDay(new Date(2025, 2, 3)));
  });

  it("should not match when month is attached to previous word", () => {
    const results = extractor.extract("ReleaseJan 15 milestone", context);

    expect(results).toHaveLength(0);
  });

  it("should match when punctuation follows the date", () => {
    const results = extractor.extract("Launch Jan 15.", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.match).toBe("Jan 15");
  });

  it("should return empty when no absolute date found", () => {
    const results = extractor.extract("Just a task", context);

    expect(results).toEqual([]);
  });
});
