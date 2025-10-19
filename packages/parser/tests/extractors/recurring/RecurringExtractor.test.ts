import { describe, it, expect } from "vitest";
import { RecurringExtractor } from "../../../src/extractors/recurring/RecurringExtractor";
import type { ParserContext } from "../../../src/types";

describe("RecurringExtractor", () => {
  const extractor = new RecurringExtractor();
  const context: ParserContext = {
    locale: "en",
    referenceDate: new Date(),
  };

  it('should extract "every day"', () => {
    const results = extractor.extract("Exercise every day", context);

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      type: "recurring",
      value: "daily",
      match: "every day",
    });
  });

  it('should extract "daily"', () => {
    const results = extractor.extract("Meeting daily", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toBe("daily");
  });

  it('should extract "every week"', () => {
    const results = extractor.extract("Review every week", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toBe("weekly");
  });

  it('should extract "weekly"', () => {
    const results = extractor.extract("Report weekly", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toBe("weekly");
  });

  it('should extract "every monday"', () => {
    const results = extractor.extract("Team sync every monday", context);

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      type: "recurring",
      value: "weekly monday",
      match: "every monday",
    });
  });

  it('should extract "every month"', () => {
    const results = extractor.extract("Pay bills every month", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toBe("monthly");
  });

  it('should extract "monthly"', () => {
    const results = extractor.extract("Newsletter monthly", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toBe("monthly");
  });

  it('should extract "every year"', () => {
    const results = extractor.extract("Birthday every year", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toBe("yearly");
  });

  it('should extract "yearly"', () => {
    const results = extractor.extract("Checkup yearly", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toBe("yearly");
  });

  it('should extract "every 3 days"', () => {
    const results = extractor.extract("Backup every 3 days", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toBe("every 3 days");
  });

  it('should extract "every 2 weeks"', () => {
    const results = extractor.extract("Sprint every 2 weeks", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toBe("every 2 weeks");
  });

  it("should return empty array when no recurring pattern found", () => {
    const results = extractor.extract("Just a task", context);

    expect(results).toEqual([]);
  });

  it("should respect disabled sections", () => {
    const context: ParserContext = {
      locale: "en",
      referenceDate: new Date(),
      disabledSections: new Set(["daily"]),
    };

    const results = extractor.extract("Meeting daily", context);

    expect(results).toEqual([]);
  });
});
