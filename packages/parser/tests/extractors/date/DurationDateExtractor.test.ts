import { describe, it, expect } from "vitest";
import { DurationDateExtractor } from "../../../src/extractors/date/DurationDateExtractor";
import { addDays, addWeeks, addMonths, addYears } from "date-fns";
import type { ParserContext } from "../../../src/types";

describe("DurationDateExtractor", () => {
  const extractor = new DurationDateExtractor();
  const referenceDate = new Date(2025, 0, 15); // Jan 15, 2025
  const context: ParserContext = {
    locale: "en",
    referenceDate,
  };

  describe("Days patterns", () => {
    it("should extract 'in 3d' pattern", () => {
      const results = extractor.extract("Review in 3d", context);

      expect(results).toHaveLength(1);
      expect(results[0]?.type).toBe("date");
      expect(results[0]?.value).toEqual(addDays(referenceDate, 3));
      expect(results[0]?.match).toBe("in 3d");
    });

    it("should extract 'in 1 day' pattern", () => {
      const results = extractor.extract("Call in 1 day", context);

      expect(results).toHaveLength(1);
      expect(results[0]?.type).toBe("date");
      expect(results[0]?.value).toEqual(addDays(referenceDate, 1));
      expect(results[0]?.match).toBe("in 1 day");
    });

    it("should extract 'in 2 days' pattern", () => {
      const results = extractor.extract("Meeting in 2 days", context);

      expect(results).toHaveLength(1);
      expect(results[0]?.type).toBe("date");
      expect(results[0]?.value).toEqual(addDays(referenceDate, 2));
      expect(results[0]?.match).toBe("in 2 days");
    });
  });

  describe("Weeks patterns", () => {
    it("should extract 'in 1w' pattern", () => {
      const results = extractor.extract("Deadline in 1w", context);

      expect(results).toHaveLength(1);
      expect(results[0]?.type).toBe("date");
      expect(results[0]?.value).toEqual(addWeeks(referenceDate, 1));
      expect(results[0]?.match).toBe("in 1w");
    });

    it("should extract 'in 2 weeks' pattern", () => {
      const results = extractor.extract("Project in 2 weeks", context);

      expect(results).toHaveLength(1);
      expect(results[0]?.type).toBe("date");
      expect(results[0]?.value).toEqual(addWeeks(referenceDate, 2));
      expect(results[0]?.match).toBe("in 2 weeks");
    });
  });

  describe("Months patterns", () => {
    it("should extract 'in 2mo' pattern", () => {
      const results = extractor.extract("Release in 2mo", context);

      expect(results).toHaveLength(1);
      expect(results[0]?.type).toBe("date");
      expect(results[0]?.value).toEqual(addMonths(referenceDate, 2));
      expect(results[0]?.match).toBe("in 2mo");
    });

    it("should extract 'in 1 month' pattern", () => {
      const results = extractor.extract("Review in 1 month", context);

      expect(results).toHaveLength(1);
      expect(results[0]?.type).toBe("date");
      expect(results[0]?.value).toEqual(addMonths(referenceDate, 1));
      expect(results[0]?.match).toBe("in 1 month");
    });
  });

  describe("Years patterns", () => {
    it("should extract 'in 1y' pattern", () => {
      const results = extractor.extract("Anniversary in 1y", context);

      expect(results).toHaveLength(1);
      expect(results[0]?.type).toBe("date");
      expect(results[0]?.value).toEqual(addYears(referenceDate, 1));
      expect(results[0]?.match).toBe("in 1y");
    });

    it("should extract 'in 2 years' pattern", () => {
      const results = extractor.extract("Goal in 2 years", context);

      expect(results).toHaveLength(1);
      expect(results[0]?.type).toBe("date");
      expect(results[0]?.value).toEqual(addYears(referenceDate, 2));
      expect(results[0]?.match).toBe("in 2 years");
    });
  });

  describe("Edge cases", () => {
    it("should return empty when no duration date found", () => {
      const results = extractor.extract("Just a task", context);

      expect(results).toEqual([]);
    });

    it("should respect disabled sections", () => {
      const contextWithDisabled: ParserContext = {
        locale: "en",
        referenceDate,
        disabledSections: new Set(["in 3d"]),
      };

      const results = extractor.extract("Review in 3d", contextWithDisabled);

      expect(results).toEqual([]);
    });

    it("should handle multiple duration dates", () => {
      const results = extractor.extract(
        "Task in 1d and another in 1w",
        context,
      );

      expect(results).toHaveLength(2);
      expect(results[0]?.match).toBe("in 1d");
      expect(results[1]?.match).toBe("in 1w");
    });
  });
});
