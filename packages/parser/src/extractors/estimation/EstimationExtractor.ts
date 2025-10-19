import type { Extractor } from "../base/Extractor";
import type { ExtractionResult, ParserContext } from "../../types";

interface EstimationPattern {
  pattern: RegExp;
  getValue: (match: RegExpMatchArray) => number;
}

// Combined hour + minute patterns (e.g., ~1h30m, ~2h15m)
const COMBINED_PATTERNS: EstimationPattern[] = [
  {
    pattern: /~(\d+)h(\d+)m/gi,
    getValue: (match) => {
      const hours = parseInt(match[1]);
      const minutes = parseInt(match[2]);
      return hours * 60 + minutes;
    },
  },
];

// Hour only patterns (e.g., ~1h, ~2h)
const HOUR_PATTERNS: EstimationPattern[] = [
  {
    pattern: /~(\d+)h/gi,
    getValue: (match) => {
      const hours = parseInt(match[1]);
      return hours * 60;
    },
  },
];

// Minute only patterns (e.g., ~30min, ~45m)
const MINUTE_PATTERNS: EstimationPattern[] = [
  {
    pattern: /~(\d+)min/gi,
    getValue: (match) => {
      const minutes = parseInt(match[1]);
      return minutes;
    },
  },
  {
    pattern: /~(\d+)m\b/gi, // Only match if followed by word boundary to avoid conflicts
    getValue: (match) => {
      const minutes = parseInt(match[1]);
      return minutes;
    },
  },
];

export class EstimationExtractor implements Extractor {
  readonly name = "estimation-extractor";
  readonly type = "estimation";

  extract(text: string, context: ParserContext): ExtractionResult[] {
    const results: ExtractionResult[] = [];
    const seenRanges: Array<{ start: number; end: number }> = [];

    // Helper function to add a result with overlap resolution
    // More specific patterns (longer) should replace generic ones (shorter)
    const addResult = (result: ExtractionResult) => {
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
        const existingLength =
          seenRanges[overlappingIndex].end - seenRanges[overlappingIndex].start;
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
    };

    // Extract combined patterns first (most specific)
    for (const { pattern, getValue } of COMBINED_PATTERNS) {
      const matches = [...text.matchAll(pattern)];

      for (const match of matches) {
        const captured = match[0];
        if (!captured) continue;

        if (context.disabledSections?.has(captured.toLowerCase())) {
          continue;
        }

        const startIndex = match.index || 0;

        addResult({
          type: "estimation",
          value: getValue(match),
          match: captured,
          startIndex,
          endIndex: startIndex + captured.length,
        });
      }
    }

    // Extract hour patterns
    for (const { pattern, getValue } of HOUR_PATTERNS) {
      const matches = [...text.matchAll(pattern)];

      for (const match of matches) {
        const captured = match[0];
        if (!captured) continue;

        if (context.disabledSections?.has(captured.toLowerCase())) {
          continue;
        }

        const startIndex = match.index || 0;

        addResult({
          type: "estimation",
          value: getValue(match),
          match: captured,
          startIndex,
          endIndex: startIndex + captured.length,
        });
      }
    }

    // Extract minute patterns (processed last to avoid conflicts with combined patterns)
    for (const { pattern, getValue } of MINUTE_PATTERNS) {
      const matches = [...text.matchAll(pattern)];

      for (const match of matches) {
        const captured = match[0];
        if (!captured) continue;

        if (context.disabledSections?.has(captured.toLowerCase())) {
          continue;
        }

        const startIndex = match.index || 0;

        addResult({
          type: "estimation",
          value: getValue(match),
          match: captured,
          startIndex,
          endIndex: startIndex + captured.length,
        });
      }
    }

    // Sort results by position to maintain order
    return results.sort((a, b) => a.startIndex - b.startIndex);
  }
}
