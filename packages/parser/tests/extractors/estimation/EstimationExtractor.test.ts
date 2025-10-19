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
      value: 30,
      match: "~30min",
    });
  });

  it('should extract "~1h"', () => {
    const results = extractor.extract("Meeting ~1h", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toBe(60);
  });

  it('should extract "~2h"', () => {
    const results = extractor.extract("Work on feature ~2h", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toBe(120);
  });

  it('should extract "~1h30m"', () => {
    const results = extractor.extract("Design session ~1h30m", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toBe(90);
  });

  it('should extract "~2h15m"', () => {
    const results = extractor.extract("Deep work ~2h15m", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toBe(135);
  });

  it('should extract "~45m"', () => {
    const results = extractor.extract("Quick call ~45m", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toBe(45);
  });

  it('should extract "~3h45m"', () => {
    const results = extractor.extract("Long meeting ~3h45m", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toBe(225);
  });

  it('should extract "~15min"', () => {
    const results = extractor.extract("Break ~15min", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toBe(15);
  });

  it('should extract "~8h"', () => {
    const results = extractor.extract("Full workday ~8h", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toBe(480);
  });

  it('should extract "~30m" (short form)', () => {
    const results = extractor.extract("Task ~30m", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toBe(30);
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
    expect(results[0]?.value).toBe(30);
    expect(results[1]?.value).toBe(60);
  });
});
