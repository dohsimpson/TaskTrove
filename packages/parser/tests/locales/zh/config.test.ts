import { describe, it, expect } from "vitest";
import { ChineseLocaleConfig } from "../../../src/locales/zh/config";
import type { LocaleConfig } from "../../../src/locales/base/LocaleConfig";
import { addDays, startOfDay } from "date-fns";

describe("ChineseLocaleConfig", () => {
  const referenceDate = new Date(2025, 0, 15); // Jan 15, 2025
  const context = {
    locale: "zh",
    referenceDate,
  };

  it("should implement LocaleConfig interface", () => {
    const config = new ChineseLocaleConfig();

    expect(config.locale).toBe("zh");
    expect(typeof config.getExtractors).toBe("function");
    expect(typeof config.getProcessors).toBe("function");
  });

  it("should return extractors with Chinese date patterns", () => {
    const config = new ChineseLocaleConfig();
    const extractors = config.getExtractors();

    expect(extractors.length).toBeGreaterThan(0);

    // Find Chinese date extractor
    const dateExtractor = extractors.find(
      (e) => e.name === "chinese-date-extractor",
    );
    expect(dateExtractor).toBeTruthy();

    // Test extracting Chinese date patterns
    const results = dateExtractor!.extract("明天开会", context);
    expect(results).toHaveLength(1);
    expect(results[0]?.value).toEqual(startOfDay(addDays(referenceDate, 1)));
  });

  it("should extract 今天 (today)", () => {
    const config = new ChineseLocaleConfig();
    const extractors = config.getExtractors();
    const dateExtractor = extractors.find(
      (e) => e.name === "chinese-date-extractor",
    )!;

    const results = dateExtractor.extract("今天开会", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toEqual(startOfDay(referenceDate));
    expect(results[0]?.match).toBe("今天");
  });

  it("should extract 明天 (tomorrow)", () => {
    const config = new ChineseLocaleConfig();
    const extractors = config.getExtractors();
    const dateExtractor = extractors.find(
      (e) => e.name === "chinese-date-extractor",
    )!;

    const results = dateExtractor.extract("明天开会", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toEqual(startOfDay(addDays(referenceDate, 1)));
    expect(results[0]?.match).toBe("明天");
  });

  it("should extract 下周 (next week)", () => {
    const config = new ChineseLocaleConfig();
    const extractors = config.getExtractors();
    const dateExtractor = extractors.find(
      (e) => e.name === "chinese-date-extractor",
    )!;

    const results = dateExtractor.extract("下周开会", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.match).toBe("下周");
  });

  it("should allow disabling extractors via config", () => {
    const config = new ChineseLocaleConfig({
      disabledExtractors: ["priority-extractor"],
    });

    const extractors = config.getExtractors();

    // Should not have priority extractor
    expect(extractors.find((e) => e.name === "priority-extractor")).toBeFalsy();
  });
});
