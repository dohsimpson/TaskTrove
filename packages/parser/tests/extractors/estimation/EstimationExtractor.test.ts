import { describe, it, expect } from "vitest";
import { EstimationExtractor } from "../../../src/extractors/estimation/EstimationExtractor";
import type { ParserContext } from "../../../src/types";

describe("EstimationExtractor", () => {
  const extractor = new EstimationExtractor();
  const context: ParserContext = {
    locale: "en",
    referenceDate: new Date(),
  };

  it('should extract "~30min"', () => {
    const results = extractor.extract("Review code ~30min", context);

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      type: "estimation",
      value: 30 * 60, // 30 minutes = 1800 seconds
      match: "~30min",
    });
  });

  it('should extract "~1h"', () => {
    const results = extractor.extract("Meeting ~1h", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toBe(60 * 60); // 1 hour = 3600 seconds
  });

  it('should extract "~2h"', () => {
    const results = extractor.extract("Work on feature ~2h", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toBe(2 * 60 * 60); // 2 hours = 7200 seconds
  });

  it('should extract "~1h30m"', () => {
    const results = extractor.extract("Design session ~1h30m", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toBe(1 * 60 * 60 + 30 * 60); // 1h30m = 5400 seconds
  });

  it('should extract "~2h15m"', () => {
    const results = extractor.extract("Deep work ~2h15m", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toBe(2 * 60 * 60 + 15 * 60); // 2h15m = 8100 seconds
  });

  it('should extract "~45m"', () => {
    const results = extractor.extract("Quick call ~45m", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toBe(45 * 60); // 45 minutes = 2700 seconds
  });

  it('should extract "~3h45m"', () => {
    const results = extractor.extract("Long meeting ~3h45m", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toBe(3 * 60 * 60 + 45 * 60); // 3h45m = 13500 seconds
  });

  it('should extract "~15min"', () => {
    const results = extractor.extract("Break ~15min", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toBe(15 * 60); // 15 minutes = 900 seconds
  });

  it('should extract "~8h"', () => {
    const results = extractor.extract("Full workday ~8h", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toBe(8 * 60 * 60); // 8 hours = 28800 seconds
  });

  it('should extract "~30m" (short form)', () => {
    const results = extractor.extract("Task ~30m", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toBe(30 * 60); // 30 minutes = 1800 seconds
  });

  it("should not extract when attached to a preceding word", () => {
    const results = extractor.extract("Task1~2h", context);

    expect(results).toHaveLength(0);
  });

  it("should not extract when followed by a word character", () => {
    const results = extractor.extract("Task ~2hwork", context);

    expect(results).toHaveLength(0);
  });

  it("should return empty array when no estimation found", () => {
    const results = extractor.extract("Just a task", context);

    expect(results).toEqual([]);
  });

  it("should respect disabled sections", () => {
    const context: ParserContext = {
      locale: "en",
      referenceDate: new Date(),
      disabledSections: new Set(["~1h"]),
    };

    const results = extractor.extract("Meeting ~1h", context);

    expect(results).toEqual([]);
  });

  it("should handle multiple estimations in text", () => {
    const results = extractor.extract("Task1 ~30min then Task2 ~1h", context);

    expect(results).toHaveLength(2);
    expect(results[0]?.value).toBe(30 * 60); // 30 minutes = 1800 seconds
    expect(results[1]?.value).toBe(60 * 60); // 1 hour = 3600 seconds
  });
});
