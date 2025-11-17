import { describe, it, expect } from "vitest";
import { buildTagPattern } from "../../src/utils/TagPattern";

describe("buildTagPattern", () => {
  it("should match prefix-separated tokens", () => {
    const pattern = buildTagPattern({ prefix: "#", flags: "gi" });
    const matches = [..."Task #work today".matchAll(pattern)];

    expect(matches).toHaveLength(1);
    expect(matches[0]?.[1]).toBe("work");
  });

  it("should not match when prefix touches previous word", () => {
    const pattern = buildTagPattern({ prefix: "@", flags: "gi" });
    const matches = [..."email@example.com".matchAll(pattern)];

    expect(matches).toHaveLength(0);
  });

  it("should respect provided candidate list", () => {
    const pattern = buildTagPattern({
      prefix: "#",
      candidates: ["Work Tasks", "Work"],
      flags: "gi",
    });
    const matches = [..."Finish #Work Tasks today".matchAll(pattern)];

    expect(matches).toHaveLength(1);
    expect(matches[0]?.[1]).toBe("Work Tasks");
  });

  it("should capture unicode tag bodies", () => {
    const pattern = buildTagPattern({ prefix: "#", flags: "gi" });
    const matches = [..."完成 #项目A 明天".matchAll(pattern)];

    expect(matches).toHaveLength(1);
    expect(matches[0]?.[1]).toBe("项目A");
  });

  it("should enforce unicode flag automatically", () => {
    const pattern = buildTagPattern({ prefix: "#", flags: "g" });
    expect(pattern.flags).toContain("u");
  });
});
