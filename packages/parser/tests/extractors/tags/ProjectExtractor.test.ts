import { describe, it, expect } from "vitest";
import { ProjectExtractor } from "../../../src/extractors/tags/ProjectExtractor";
import type { ParserContext } from "../../../src/types";

describe("ProjectExtractor", () => {
  const extractor = new ProjectExtractor();

  it("should extract project with # prefix", () => {
    const context: ParserContext = {
      locale: "en",
      referenceDate: new Date(),
    };

    const results = extractor.extract("Buy milk #groceries", context);

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      type: "project",
      value: "groceries",
      match: "#groceries",
    });
  });

  it("should extract project from known projects list", () => {
    const context: ParserContext = {
      locale: "en",
      referenceDate: new Date(),
      projects: [{ name: "Work Tasks" }, { name: "Personal" }],
    };

    const results = extractor.extract("Meeting #Work Tasks tomorrow", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toBe("Work Tasks");
  });

  it("should handle multiple project mentions", () => {
    const context: ParserContext = {
      locale: "en",
      referenceDate: new Date(),
    };

    const results = extractor.extract(
      "Task #project1 related to #project2",
      context,
    );

    expect(results).toHaveLength(2);
    expect(results[0]?.value).toBe("project1");
    expect(results[1]?.value).toBe("project2");
  });

  it("should return empty array when no project found", () => {
    const context: ParserContext = {
      locale: "en",
      referenceDate: new Date(),
    };

    const results = extractor.extract("Just a task", context);

    expect(results).toEqual([]);
  });

  it("should respect disabled sections", () => {
    const context: ParserContext = {
      locale: "en",
      referenceDate: new Date(),
      disabledSections: new Set(["#work"]),
    };

    const results = extractor.extract("Task #work done", context);

    expect(results).toEqual([]);
  });
});
