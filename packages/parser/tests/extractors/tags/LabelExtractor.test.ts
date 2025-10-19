import { describe, it, expect } from "vitest";
import { LabelExtractor } from "../../../src/extractors/tags/LabelExtractor";
import type { ParserContext } from "../../../src/types";

describe("LabelExtractor", () => {
  const extractor = new LabelExtractor();

  it("should extract label with @ prefix", () => {
    const context: ParserContext = {
      locale: "en",
      referenceDate: new Date(),
    };

    const results = extractor.extract("Buy milk @urgent", context);

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      type: "label",
      value: "urgent",
      match: "@urgent",
    });
  });

  it("should extract multiple labels", () => {
    const context: ParserContext = {
      locale: "en",
      referenceDate: new Date(),
    };

    const results = extractor.extract("Task @work @important", context);

    expect(results).toHaveLength(2);
    expect(results[0]?.value).toBe("work");
    expect(results[1]?.value).toBe("important");
  });

  it("should extract labels from known labels list", () => {
    const context: ParserContext = {
      locale: "en",
      referenceDate: new Date(),
      labels: [{ name: "High Priority" }, { name: "Urgent" }],
    };

    const results = extractor.extract(
      "Meeting @High Priority tomorrow",
      context,
    );

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toBe("High Priority");
  });

  it("should return empty array when no labels found", () => {
    const context: ParserContext = {
      locale: "en",
      referenceDate: new Date(),
    };

    const results = extractor.extract("Just a task", context);

    expect(results).toEqual([]);
  });
});
