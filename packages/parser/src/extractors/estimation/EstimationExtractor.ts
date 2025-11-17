import type { Extractor } from "../base/Extractor";
import type { ExtractionResult, ParserContext } from "../../types";
import { buildBoundedPattern } from "../../utils/patterns";

interface EstimationPattern {
  pattern: RegExp;
  getValue: (match: RegExpMatchArray) => number;
}

// Combined hour + minute patterns (e.g., ~1h30m, ~2h15m)
const COMBINED_PATTERNS: EstimationPattern[] = [
  {
    pattern: buildBoundedPattern("~(\\d+)h(\\d+)m"),
    getValue: (match) => {
      const hoursStr = match[1];
      const minutesStr = match[2];
      if (!hoursStr || !minutesStr) return 0;

      const hours = parseInt(hoursStr);
      const minutes = parseInt(minutesStr);
      // Convert to seconds
      return hours * 3600 + minutes * 60;
    },
  },
];

// Hour only patterns (e.g., ~1h, ~2h)
const HOUR_PATTERNS: EstimationPattern[] = [
  {
    pattern: buildBoundedPattern("~(\\d+)h"),
    getValue: (match) => {
      const hoursStr = match[1];
      if (!hoursStr) return 0;

      const hours = parseInt(hoursStr);
      // Convert to seconds
      return hours * 3600;
    },
  },
];

// Minute only patterns (e.g., ~30min, ~45m)
const MINUTE_PATTERNS: EstimationPattern[] = [
  {
    pattern: buildBoundedPattern("~(\\d+)min"),
    getValue: (match) => {
      const minutesStr = match[1];
      if (!minutesStr) return 0;

      const minutes = parseInt(minutesStr);
      // Convert to seconds
      return minutes * 60;
    },
  },
  {
    pattern: buildBoundedPattern("~(\\d+)m"),
    getValue: (match) => {
      const minutesStr = match[1];
      if (!minutesStr) return 0;

      const minutes = parseInt(minutesStr);
      // Convert to seconds
      return minutes * 60;
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
