import type { Extractor } from "../base/Extractor";
import type { ExtractionResult, ParserContext } from "../../types";
import { buildBoundedPattern } from "../../utils/patterns";

interface PriorityPattern {
  pattern: RegExp;
  level: number;
}

const PRIORITY_PATTERNS: PriorityPattern[] = [
  {
    pattern: buildBoundedPattern("(p1)"),
    level: 1,
  },
  {
    pattern: buildBoundedPattern("(p2)"),
    level: 2,
  },
  {
    pattern: buildBoundedPattern("(p3)"),
    level: 3,
  },
  {
    pattern: buildBoundedPattern("(p4)"),
    level: 4,
  },
];

const EXCLAMATION_PATTERNS: PriorityPattern[] = [
  {
    pattern: /(?<!\S)(!!!)(?=$|\s)/g,
    level: 1,
  },
  {
    pattern: /(?<!\S)(!!)(?=$|\s)/g,
    level: 2,
  },
  {
    pattern: /(?<!\S)(!)(?=$|\s)/g,
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
