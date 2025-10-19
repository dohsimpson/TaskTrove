import { describe, it, expect } from "vitest";
import { EnglishLocaleConfig } from "../../../src/locales/en/config";
import type { LocaleConfig } from "../../../src/locales/base/LocaleConfig";

describe("EnglishLocaleConfig", () => {
  it("should implement LocaleConfig interface", () => {
    const config = new EnglishLocaleConfig();

    expect(config.locale).toBe("en");
    expect(typeof config.getExtractors).toBe("function");
    expect(typeof config.getProcessors).toBe("function");
  });

  it("should return all default extractors", () => {
    const config = new EnglishLocaleConfig();
    const extractors = config.getExtractors();

    expect(extractors.length).toBeGreaterThan(0);
    expect(extractors[0]?.name).toBeTruthy();
    expect(extractors[0]?.extract).toBeTruthy();
  });

  it("should return all default processors", () => {
    const config = new EnglishLocaleConfig();
    const processors = config.getProcessors();

    expect(processors.length).toBeGreaterThan(0);
    expect(processors[0]?.name).toBeTruthy();
    expect(processors[0]?.process).toBeTruthy();
  });

  it("should allow disabling extractors via config", () => {
    const config = new EnglishLocaleConfig({
      disabledExtractors: ["priority-extractor"],
    });

    const extractors = config.getExtractors();

    // Should not have priority extractor
    expect(extractors.find((e) => e.name === "priority-extractor")).toBeFalsy();
  });

  it("should allow custom extractor order", () => {
    const config = new EnglishLocaleConfig({
      extractorOrder: ["project-extractor", "priority-extractor"],
    });

    const extractors = config.getExtractors();

    // First extractor should be project-extractor
    expect(extractors[0]?.name).toBe("project-extractor");
  });
});
