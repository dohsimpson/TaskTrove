import type { Processor } from "./base/Processor";
import type { ExtractionResult, ParserContext } from "../types";

export class LastOccurrenceSelector implements Processor {
  readonly name = "last-occurrence-selector";

  process(
    results: ExtractionResult[],
    context: ParserContext,
  ): ExtractionResult[] {
    // Group results by type
    const groupedByType = new Map<string, ExtractionResult[]>();

    for (const result of results) {
      if (!groupedByType.has(result.type)) {
        groupedByType.set(result.type, []);
      }
      groupedByType.get(result.type)!.push(result);
    }

    // For each type, keep only the last occurrence (by position)
    const processedResults: ExtractionResult[] = [];
    for (const [type, typeResults] of groupedByType) {
      if (typeResults.length === 1) {
        const singleResult = typeResults[0];
        if (singleResult) {
          processedResults.push(singleResult);
        }
      } else {
        // Find the result with the highest startIndex (last occurrence)
        const lastResult = typeResults.reduce((latest, current) =>
          current.startIndex > latest.startIndex ? current : latest,
        );
        processedResults.push(lastResult);
      }
    }

    // Sort by position to maintain original order
    return processedResults.sort((a, b) => a.startIndex - b.startIndex);
  }
}
