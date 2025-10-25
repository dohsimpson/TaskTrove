import type { Processor } from "@tasktrove/parser/processors/base";
import type { ExtractionResult, ParserContext } from "@tasktrove/parser/types";

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

    // For each type, handle based on whether multiple occurrences are allowed
    const processedResults: ExtractionResult[] = [];
    for (const [type, typeResults] of groupedByType) {
      // Types that allow multiple occurrences
      if (type === "label") {
        // Keep unique labels, preserving order of last occurrence
        // Deduplicate identical label values while allowing different labels
        const uniqueLabels = new Map<string, ExtractionResult>();

        for (const result of typeResults) {
          const labelValue = (result.value as string).toLowerCase();
          // Keep the last occurrence of each label value
          uniqueLabels.set(labelValue, result);
        }

        // Convert back to array and sort by position
        const deduplicatedResults = Array.from(uniqueLabels.values()).sort(
          (a, b) => a.startIndex - b.startIndex,
        );

        processedResults.push(...deduplicatedResults);
      } else if (typeResults.length === 1) {
        const singleResult = typeResults[0];
        if (singleResult) {
          processedResults.push(singleResult);
        }
      } else {
        // For single-occurrence types, keep only the last occurrence
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
