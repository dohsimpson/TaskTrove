import { describe, it, expect } from "vitest";
import type { Extractor } from "../../../src/extractors/base/Extractor";
import type { ParserContext } from "../../../src/types";

class TestExtractor implements Extractor {
  readonly name = "test-extractor";
  readonly type = "test";

  extract(text: string, context: ParserContext) {
    return [
      {
        type: "priority" as const,
        value: 1,
        match: "test",
        startIndex: 0,
        endIndex: 4,
      },
    ];
  }
}

describe("Extractor interface", () => {
  it("should implement required properties", () => {
    const extractor = new TestExtractor();

    expect(extractor.name).toBe("test-extractor");
    expect(extractor.type).toBe("test");
    expect(typeof extractor.extract).toBe("function");
  });

  it("should extract results with correct structure", () => {
    const extractor = new TestExtractor();
    const context: ParserContext = {
      locale: "en",
      referenceDate: new Date(),
    };

    const results = extractor.extract("test", context);

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      type: "priority",
      value: 1,
      match: "test",
      startIndex: 0,
      endIndex: 4,
    });
  });
});
