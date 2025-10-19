import { describe, it, expect } from "vitest";
import { TimeExtractor } from "../../../src/extractors/time/TimeExtractor";
import type { ParserContext } from "../../../src/types";

describe("TimeExtractor", () => {
  const extractor = new TimeExtractor();
  const context: ParserContext = {
    locale: "en",
    referenceDate: new Date(),
  };

  it("should extract 12-hour format with AM/PM (3PM)", () => {
    const results = extractor.extract("Meeting 3PM", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.type).toBe("time");
    expect(results[0]?.value).toBe("15:00");
    expect(results[0]?.match).toBe("3PM");
  });

  it("should extract 12-hour format with space (3 PM)", () => {
    const results = extractor.extract("Call 3 PM", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toBe("15:00");
    expect(results[0]?.match).toBe("3 PM");
  });

  it("should extract 12-hour format with am/pm (3am)", () => {
    const results = extractor.extract("Breakfast 3am", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toBe("03:00");
    expect(results[0]?.match).toBe("3am");
  });

  it("should extract 24-hour format (14:00)", () => {
    const results = extractor.extract("Meeting 14:00", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toBe("14:00");
    expect(results[0]?.match).toBe("14:00");
  });

  it("should extract 24-hour format with minutes (09:30)", () => {
    const results = extractor.extract("Start 09:30", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toBe("09:30");
  });

  it('should extract time with "at" prefix (at 9AM)', () => {
    const results = extractor.extract("Meet at 9AM", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toBe("09:00");
    expect(results[0]?.match).toBe("at 9AM");
  });

  it('should extract time with "at" prefix and 24-hour format (at 14:30)', () => {
    const results = extractor.extract("Call at 14:30", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toBe("14:30");
    expect(results[0]?.match).toBe("at 14:30");
  });

  it("should extract hour only (9 AM)", () => {
    const results = extractor.extract("Meeting 9 AM", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toBe("09:00");
    expect(results[0]?.match).toBe("9 AM");
  });

  it("should extract time with minutes in 12-hour format (9:30 AM)", () => {
    const results = extractor.extract("Start 9:30 AM", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toBe("09:30");
    expect(results[0]?.match).toBe("9:30 AM");
  });

  it("should handle noon as 12:00 PM", () => {
    const results = extractor.extract("Meeting noon", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toBe("12:00");
    expect(results[0]?.match).toBe("noon");
  });

  it("should handle midnight as 00:00", () => {
    const results = extractor.extract("Call midnight", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toBe("00:00");
    expect(results[0]?.match).toBe("midnight");
  });

  it("should return empty when no time found", () => {
    const results = extractor.extract("Just a task", context);

    expect(results).toEqual([]);
  });

  it("should respect disabled sections", () => {
    const contextWithDisabled: ParserContext = {
      locale: "en",
      referenceDate: new Date(),
      disabledSections: new Set(["3pm"]),
    };

    const results = extractor.extract("Meeting 3PM", contextWithDisabled);

    expect(results).toEqual([]);
  });
});
