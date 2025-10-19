import type { Extractor } from "../base/Extractor";
import type { ExtractionResult, ParserContext } from "../../types";

interface PriorityPattern {
  pattern: RegExp;
  level: number;
}

const PRIORITY_PATTERNS: PriorityPattern[] = [
  {
    pattern: /\b(p1)\b/gi,
    level: 1,
  },
  {
    pattern: /\b(p2)\b/gi,
    level: 2,
  },
  {
    pattern: /\b(p3)\b/gi,
    level: 3,
  },
  {
    pattern: /\b(p4)\b/gi,
    level: 4,
  },
];

const EXCLAMATION_PATTERNS: PriorityPattern[] = [
  {
    pattern: /(?<!\!)(!!!)(?!\!)/g,
    level: 1,
  },
  {
    pattern: /(?<!\!)(!!)(?!\!)/g,
    level: 2,
  },
  {
    pattern: /(?<!\!)(!)(?!\!)/g,
    level: 3,
  },
];

export class PriorityExtractor implements Extractor {
  readonly name = "priority-extractor";
  readonly type = "priority";

  extract(text: string, context: ParserContext): ExtractionResult[] {
    const results: ExtractionResult[] = [];

    // Extract p1-p4 patterns
    for (const { pattern, level } of PRIORITY_PATTERNS) {
      const matches = [...text.matchAll(pattern)];

      for (const match of matches) {
        const captured = match[1];
        if (!captured) continue;

        if (context.disabledSections?.has(captured.toLowerCase())) {
          continue;
        }

        const startIndex = match.index || 0;

        results.push({
          type: "priority",
          value: level,
          match: captured,
          startIndex,
          endIndex: startIndex + captured.length,
        });
      }
    }

    // Extract exclamation patterns
    for (const { pattern, level } of EXCLAMATION_PATTERNS) {
      const matches = [...text.matchAll(pattern)];

      for (const match of matches) {
        const captured = match[1];
        if (!captured) continue;

        if (context.disabledSections?.has(captured.toLowerCase())) {
          continue;
        }

        const startIndex = match.index || 0;

        results.push({
          type: "priority",
          value: level,
          match: captured,
          startIndex,
          endIndex: startIndex + captured.length,
        });
      }
    }

    // Sort results by position in text (startIndex) to return them in the order they appear
    return results.sort((a, b) => a.startIndex - b.startIndex);
  }
}
