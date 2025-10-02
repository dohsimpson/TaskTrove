import { describe, it, expect } from "vitest";
import type { Language, I18nConfig, UseTranslationOptions } from "./index";

describe("@tasktrove/i18n types", () => {
  it("should export Language type", () => {
    const lang: Language = "en";
    expect(typeof lang).toBe("string");
  });

  it("should allow creating I18nConfig", () => {
    const config: I18nConfig<"en" | "zh", "common"> = {
      languages: ["en", "zh"],
      fallbackLng: "en",
      namespaces: ["common"],
      defaultNS: "common",
      cookieName: "test",
      resourceLoader: async () => ({}),
    };

    expect(config.languages).toEqual(["en", "zh"]);
    expect(config.fallbackLng).toBe("en");
  });

  it("should allow UseTranslationOptions type", () => {
    const options: UseTranslationOptions = {
      keyPrefix: "test",
    };

    expect(options.keyPrefix).toBe("test");
  });
});
