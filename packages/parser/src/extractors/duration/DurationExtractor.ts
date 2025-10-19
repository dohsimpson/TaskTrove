import type { Extractor } from "../base/Extractor";
import type { ExtractionResult, ParserContext } from "../../types";

interface DurationPattern {
  pattern: RegExp;
  getValue: (match: RegExpMatchArray) => string;
}

// "for Xh" patterns (e.g., "for 1h", "for 2h")
const FOR_HOUR_PATTERNS: DurationPattern[] = [
  {
    pattern: /\bfor\s+(\d+)\s*h\b/gi,
    getValue: (match) => match[1] + "h",
  },
  {
    pattern: /\bfor\s+(\d+)\s*hours?\b/gi,
    getValue: (match) => match[1] + "h",
  },
];

// "for Xm" patterns (e.g., "for 30m", "for 45min")
const FOR_MINUTE_PATTERNS: DurationPattern[] = [
  {
    pattern: /\bfor\s+(\d+)\s*m\b/gi,
    getValue: (match) => match[1] + "m",
  },
  {
    pattern: /\bfor\s+(\d+)\s*minutes?\b/gi,
    getValue: (match) => match[1] + "m",
  },
];

// Direct duration patterns (e.g., "1h", "30m")
const DIRECT_PATTERNS: DurationPattern[] = [
  {
    pattern: /\b(\d+)h\b/gi,
    getValue: (match) => match[1] + "h",
  },
  {
    pattern: /\b(\d+)\s*hours?\b/gi,
    getValue: (match) => match[1] + "h",
  },
  {
    pattern: /\b(\d+)m\b/gi,
    getValue: (match) => match[1] + "m",
  },
  {
    pattern: /\b(\d+)\s*minutes?\b/gi,
    getValue: (match) => match[1] + "m",
  },
];

export class DurationExtractor implements Extractor {
  readonly name = "duration-extractor";
  readonly type = "duration";

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

    // Extract "for" patterns first (most specific)
    for (const { pattern, getValue } of FOR_HOUR_PATTERNS) {
      const matches = [...text.matchAll(pattern)];

      for (const match of matches) {
        const captured = match[0];
        if (!captured) continue;

        if (context.disabledSections?.has(captured.toLowerCase())) {
          continue;
        }

        const startIndex = match.index || 0;

        addResult({
          type: "duration",
          value: getValue(match),
          match: captured,
          startIndex,
          endIndex: startIndex + captured.length,
        });
      }
    }

    for (const { pattern, getValue } of FOR_MINUTE_PATTERNS) {
      const matches = [...text.matchAll(pattern)];

      for (const match of matches) {
        const captured = match[0];
        if (!captured) continue;

        if (context.disabledSections?.has(captured.toLowerCase())) {
          continue;
        }

        const startIndex = match.index || 0;

        addResult({
          type: "duration",
          value: getValue(match),
          match: captured,
          startIndex,
          endIndex: startIndex + captured.length,
        });
      }
    }

    // Extract direct duration patterns (processed last to avoid conflicts with "for" patterns)
    for (const { pattern, getValue } of DIRECT_PATTERNS) {
      const matches = [...text.matchAll(pattern)];

      for (const match of matches) {
        const captured = match[0];
        if (!captured) continue;

        if (context.disabledSections?.has(captured.toLowerCase())) {
          continue;
        }

        const startIndex = match.index || 0;

        addResult({
          type: "duration",
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
