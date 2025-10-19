import type { ExtractionResult, ParserContext } from "../types";

export interface Pattern<T = string> {
  pattern: RegExp;
  getValue: (match: RegExpMatchArray) => T;
}

export function extractWithPatterns<T>(
  text: string,
  context: ParserContext,
  patterns: Pattern<T>[],
  resultType: ExtractionResult["type"],
  options?: {
    // For time patterns, handle overlapping matches
    handleOverlaps?: boolean;
    // Transform the value if needed
    transform?: (value: T, match: RegExpMatchArray) => T;
  },
): ExtractionResult[] {
  const results: ExtractionResult[] = [];
  const seenRanges: Array<{ start: number; end: number }> = [];

  // Helper function to check for overlaps (for time patterns)
  const hasOverlap = (start: number, end: number): boolean => {
    return seenRanges.some((range) => start < range.end && end > range.start);
  };

  // Helper function to add a result and track its range
  const addResult = (result: ExtractionResult) => {
    if (options?.handleOverlaps) {
      const overlappingIndex = seenRanges.findIndex(
        (range) =>
          result.startIndex < range.end && result.endIndex > range.start,
      );

      if (overlappingIndex === -1) {
        // No overlap, add normally
        results.push(result);
        seenRanges.push({ start: result.startIndex, end: result.endIndex });
      } else {
        // Has overlap, prefer longer (more specific) match
        const existingRange = seenRanges[overlappingIndex];
        if (!existingRange) return;

        const existingLength = existingRange.end - existingRange.start;
        const newLength = result.endIndex - result.startIndex;

        if (newLength > existingLength) {
          // Replace with more specific match
          results[overlappingIndex] = result;
          seenRanges[overlappingIndex] = {
            start: result.startIndex,
            end: result.endIndex,
          };
        }
        // If same length or shorter, keep existing
      }
    } else {
      results.push(result);
    }
  };

  for (const { pattern, getValue } of patterns) {
    const matches = [...text.matchAll(pattern)];

    for (const match of matches) {
      const captured = match[0];
      if (!captured) continue;

      // Check if disabled
      if (context.disabledSections?.has(captured.toLowerCase())) {
        continue;
      }

      const startIndex = match.index || 0;
      let value = getValue(match);

      // Apply transformation if provided
      if (options?.transform) {
        value = options.transform(value, match);
      }

      addResult({
        type: resultType,
        value,
        match: captured,
        startIndex,
        endIndex: startIndex + captured.length,
      });
    }
  }

  return results;
}
