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

  it("should prefer the longest matching project name when prefixes overlap", () => {
    const context: ParserContext = {
      locale: "en",
      referenceDate: new Date(),
      projects: [{ name: "Work" }, { name: "Work Tasks" }],
    };

    const results = extractor.extract(
      "Finish report #Work Tasks today",
      context,
    );

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toBe("Work Tasks");
  });

  it("should not match dynamic projects when additional characters follow", () => {
    const context: ParserContext = {
      locale: "en",
      referenceDate: new Date(),
      projects: [{ name: "Work" }],
    };

    const results = extractor.extract("Discuss #WorkX later", context);

    expect(results).toEqual([]);
  });

  it("should not extract project when hash is attached to preceding word", () => {
    const context: ParserContext = {
      locale: "en",
      referenceDate: new Date(),
    };

    const results = extractor.extract("hello#project plan", context);

    expect(results).toEqual([]);
  });

  it("should not extract project when preceded by non-Latin characters without space", () => {
    const context: ParserContext = {
      locale: "en",
      referenceDate: new Date(),
    };

    const results = extractor.extract("你好#project 更新", context);

    expect(results).toEqual([]);
  });

  it("should extract unicode project names when separated by whitespace", () => {
    const context: ParserContext = {
      locale: "en",
      referenceDate: new Date(),
    };

    const results = extractor.extract("完成 #项目A 明天", context);

    expect(results).toHaveLength(1);
    expect(results[0]?.value).toBe("项目A");
  });

  it("should not extract dynamic project when hash is attached to preceding word", () => {
    const context: ParserContext = {
      locale: "en",
      referenceDate: new Date(),
      projects: [{ name: "Work" }],
    };

    const results = extractor.extract("notes#Work today", context);

    expect(results).toEqual([]);
  });
});
