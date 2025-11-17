import { describe, it, expect } from "vitest";
import { DurationExtractor } from "../../../src/extractors/duration/DurationExtractor";
import type { ParserContext } from "../../../src/types";

describe("DurationExtractor", () => {
  const extractor = new DurationExtractor();
  const context: ParserContext = {
    locale: "en",
    referenceDate: new Date(),
  };

  it("should extract hour durations", () => {
    const results = extractor.extract("Focus for 2h", context);

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      type: "duration",
      value: "2h",
      match: "for 2h",
    });
  });

  it("should extract minute durations", () => {
    const results = extractor.extract("Break 30m", context);

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ value: "30m", match: "30m" });
  });

  it("should not match when attached to previous characters", () => {
    const results = extractor.extract("note1h session", context);

    expect(results).toHaveLength(0);
  });

  it("should match when punctuation follows the duration", () => {
    const results = extractor.extract("Focus 2h, break", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.match).toBe("2h");
  });
});
