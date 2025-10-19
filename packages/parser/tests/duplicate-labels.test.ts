import { describe, it, expect } from "vitest";
import { TaskParser } from "../src/TaskParser";
import type { ParserContext } from "../src/types";

describe("Duplicate Label Handling", () => {
  const parser = new TaskParser();

  const context: ParserContext = {
    locale: "en",
    referenceDate: new Date(),
    labels: [{ name: "tag1" }, { name: "tag2" }],
  };

  it("should deduplicate labels through processor pipeline", () => {
    const result = parser.parse("@tag1 @tag1 my task", context);

    // After processing through LastOccurrenceSelector, duplicates should be removed
    expect(result.parsed.labels).toEqual(["tag1"]);
    console.log("✓ Confirmed: Processor deduplicates duplicate labels");
  });

  it("should handle case-insensitive label deduplication", () => {
    const result = parser.parse("@Tag1 @TAG1 my task", context);

    // Should keep the last occurrence case
    expect(result.parsed.labels).toEqual(["TAG1"]);
    console.log("✓ Confirmed: Case-insensitive deduplication works");
  });
});
