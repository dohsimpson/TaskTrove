import { describe, it, expect } from "vitest";
import type { Processor } from "../../../src/processors/base/Processor";
import type { ParserContext, ExtractionResult } from "../../../src/types";

class TestProcessor implements Processor {
  readonly name = "test-processor";

  process(
    results: ExtractionResult[],
    context: ParserContext,
  ): ExtractionResult[] {
    return results.filter((r) => r.type === "priority");
  }
}

describe("Processor interface", () => {
  it("should implement required properties", () => {
    const processor = new TestProcessor();

    expect(processor.name).toBe("test-processor");
    expect(typeof processor.process).toBe("function");
  });

  it("should process extraction results", () => {
    const processor = new TestProcessor();
    const context: ParserContext = {
      locale: "en",
      referenceDate: new Date(),
    };

    const results: ExtractionResult[] = [
      { type: "priority", value: 1, match: "p1", startIndex: 0, endIndex: 2 },
      {
        type: "project",
        value: "work",
        match: "#work",
        startIndex: 10,
        endIndex: 15,
      },
    ];

    const processed = processor.process(results, context);

    expect(processed).toHaveLength(1);
    expect(processed[0]?.type).toBe("priority");
  });
});
