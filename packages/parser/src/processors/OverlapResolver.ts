import type { Processor } from "./base/Processor";
import type { ExtractionResult, ParserContext } from "@tasktrove/parser/types";

export class OverlapResolver implements Processor {
  readonly name = "overlap-resolver";

  process(
    results: ExtractionResult[],
    context: ParserContext,
  ): ExtractionResult[] {
    // Sort by position, then by length (longer first) to prioritize longer matches
    const sortedResults = [...results].sort((a, b) => {
      if (a.startIndex !== b.startIndex) {
        return a.startIndex - b.startIndex;
      }
      // If starting at same position, longer match comes first
      return b.endIndex - b.startIndex - (a.endIndex - a.startIndex);
    });

    const processedResults: ExtractionResult[] = [];

    for (const result of sortedResults) {
      // Check if this result overlaps with any already processed result
      const hasOverlap = processedResults.some((processed) =>
        this.overlaps(result, processed),
      );

      if (!hasOverlap) {
        processedResults.push(result);
      }
    }

    // Maintain original order of non-overlapping results
    return processedResults.sort((a, b) => a.startIndex - b.startIndex);
  }

  private overlaps(
    result1: ExtractionResult,
    result2: ExtractionResult,
  ): boolean {
    return (
      result1.startIndex < result2.endIndex &&
      result2.startIndex < result1.endIndex
    );
  }
}
