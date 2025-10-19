import { describe, it, expect } from "vitest";
import { createParser, registerCustomExtractor } from "../src/PluginSystem";
import { EnglishLocaleConfig } from "../src/locales/en/config";
import type { Extractor } from "../src/extractors/base/Extractor";
import type { ParserContext } from "../src/types";

// Custom extractor for testing
class EmojiPriorityExtractor implements Extractor {
  readonly name = "emoji-priority-extractor";
  readonly type = "priority";

  extract(text: string, context: ParserContext) {
    const results: any[] = [];

    // Match 🔥 for high priority
    const fireMatches = [...text.matchAll(/🔥/g)];
    for (const match of fireMatches) {
      if (!context.disabledSections?.has("🔥")) {
        const startIndex = match.index || 0;
        results.push({
          type: "priority" as const,
          value: 1,
          match: "🔥",
          startIndex,
          endIndex: startIndex + match[0].length,
        });
      }
    }

    return results;
  }
}

describe("Plugin System", () => {
  describe("createParser", () => {
    it("should create parser with default English configuration", () => {
      const parser = createParser();

      const result = parser.parse("Task p1 #groceries");

      expect(result.priority).toBe(1);
      expect(result.project).toBe("groceries");
      expect(result.title).toBe("Task");
    });

    it("should create parser with custom locale", () => {
      const parser = createParser({ locale: "zh" });

      const result = parser.parse("明天开会");

      expect(result.dueDate).toBeDefined();
      expect(result.title).toBe("开会");
    });

    it("should create parser with custom extractors", () => {
      const customExtractors = [new EmojiPriorityExtractor()];

      const parser = createParser({
        locale: "en",
        customExtractors,
      });

      const result = parser.parse("Urgent task 🔥");

      expect(result.priority).toBe(1);
      expect(result.title).toBe("Urgent task"); // Emoji should be removed
      expect(result.originalText).toBe("Urgent task 🔥");
    });

    it("should allow disabling default extractors", () => {
      const parser = createParser({
        locale: "en",
        disabledExtractors: ["priority-extractor"],
      });

      const result = parser.parse("Task p1");

      expect(result.priority).toBeUndefined();
      expect(result.title).toBe("Task p1");
    });

    it("should support custom extractor ordering", () => {
      const parser = createParser({
        locale: "en",
        extractorOrder: ["project-extractor", "priority-extractor"],
      });

      // Test that the order is applied correctly
      const result = parser.parse("Task p1 #groceries");

      expect(result.project).toBe("groceries");
      expect(result.priority).toBe(1);
    });
  });

  describe("registerCustomExtractor", () => {
    it("should register and use custom extractor", () => {
      registerCustomExtractor("emoji-priority", EmojiPriorityExtractor);

      const parser = createParser({
        locale: "en",
        customExtractors: ["emoji-priority"],
      });

      const result = parser.parse("Task 🔥");

      expect(result.priority).toBe(1);
      expect(result.title).toBe("Task");
    });

    it("should throw error for unregistered custom extractor", () => {
      expect(() => {
        createParser({
          locale: "en",
          customExtractors: ["non-existent-extractor"],
        });
      }).toThrow("Custom extractor 'non-existent-extractor' not found");
    });

    it("should allow overriding default extractors", () => {
      registerCustomExtractor("custom-priority", EmojiPriorityExtractor);

      const parser = createParser({
        locale: "en",
        disabledExtractors: ["priority-extractor"],
        customExtractors: ["custom-priority"],
      });

      const result = parser.parse("Task 🔥 p1");

      expect(result.priority).toBe(1); // From emoji, not p1
      expect(result.title).toBe("Task p1");
    });
  });

  describe("Parser Factory Options", () => {
    it("should support reference date", () => {
      const referenceDate = new Date(2025, 0, 15);
      const parser = createParser({
        locale: "en",
        referenceDate,
      });

      const result = parser.parse("Meeting tomorrow");

      expect(result.dueDate).toBeDefined();
    });

    it("should support projects and labels context", () => {
      const parser = createParser({
        locale: "en",
        projects: [{ name: "Work Tasks" }],
        labels: [{ name: "Urgent" }],
      });

      const result = parser.parse("Meeting #Work Tasks @Urgent");

      expect(result.project).toBe("Work Tasks");
      expect(result.labels).toEqual(["Urgent"]);
    });
  });
});
