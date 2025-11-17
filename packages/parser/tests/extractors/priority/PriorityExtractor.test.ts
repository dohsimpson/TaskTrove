import { describe, it, expect } from "vitest";
import { PriorityExtractor } from "../../../src/extractors/priority/PriorityExtractor";
import type { ParserContext } from "../../../src/types";

describe("PriorityExtractor", () => {
  const extractor = new PriorityExtractor();
  const context: ParserContext = {
    locale: "en",
    referenceDate: new Date(),
  };

  it("should extract p1 priority", () => {
    const results = extractor.extract("Buy milk p1", context);

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      type: "priority",
      value: 1,
      match: "p1",
    });
    expect(results[0]?.startIndex).toBeGreaterThanOrEqual(0);
  });

  it("should extract p2 priority", () => {
    const results = extractor.extract("Task p2 here", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toBe(2);
  });

  it("should extract p3 priority", () => {
    const results = extractor.extract("Low priority p3", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toBe(3);
  });

  it("should extract p4 priority", () => {
    const results = extractor.extract("Later p4", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toBe(4);
  });

  it("should return empty array when no priority found", () => {
    const results = extractor.extract("Just a task", context);

    expect(results).toEqual([]);
  });

  it("should not treat characters attached to priority token as valid", () => {
    const results = extractor.extract("Taskp1 later", context);

    expect(results).toHaveLength(0);
  });

  it("should not match when word characters follow the token", () => {
    const results = extractor.extract("Task p1later", context);

    expect(results).toHaveLength(0);
  });

  it("should find multiple priority occurrences", () => {
    const results = extractor.extract("Task p3 with details p1", context);

    expect(results).toHaveLength(2);
    expect(results[0]?.value).toBe(3);
    expect(results[1]?.value).toBe(1);
  });

  describe("PriorityExtractor - exclamation marks", () => {
    const extractor = new PriorityExtractor();
    const context: ParserContext = {
      locale: "en",
      referenceDate: new Date(),
    };

    it("should extract single exclamation as p3", () => {
      const results = extractor.extract("Urgent task !", context);

      expect(results).toHaveLength(1);
      expect(results[0]?.value).toBe(3);
      expect(results[0]?.match).toBe("!");
    });

    it("should extract double exclamation as p2", () => {
      const results = extractor.extract("Very urgent !!", context);

      expect(results).toHaveLength(1);
      expect(results[0]?.value).toBe(2);
      expect(results[0]?.match).toBe("!!");
    });

    it("should extract triple exclamation as p1", () => {
      const results = extractor.extract("Critical !!!", context);

      expect(results).toHaveLength(1);
      expect(results[0]?.value).toBe(1);
      expect(results[0]?.match).toBe("!!!");
    });

    it("should find all exclamation patterns", () => {
      const results = extractor.extract("Task ! and other !!", context);

      expect(results).toHaveLength(2);
      expect(results[0]?.value).toBe(3);
      expect(results[1]?.value).toBe(2);
    });

    it("should not treat punctuation-attached exclamation as priority", () => {
      const results = extractor.extract("hello!", context);

      expect(results.find((r) => r.type === "priority")).toBeUndefined();
    });

    it("should not treat non-Latin text followed by exclamation as priority", () => {
      const results = extractor.extract("你好!", context);

      expect(results.find((r) => r.type === "priority")).toBeUndefined();
    });

    it("should parse exclamation priority at start without leading space", () => {
      const results = extractor.extract("!!! urgent task", context);

      expect(results).toHaveLength(1);
      expect(results[0]?.value).toBe(1);
    });
  });
});
