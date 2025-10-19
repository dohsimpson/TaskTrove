import type { Extractor } from "../base/Extractor";
import type { ExtractionResult, ParserContext } from "../../types";

export class LabelExtractor implements Extractor {
  readonly name = "label-extractor";
  readonly type = "label";

  extract(text: string, context: ParserContext): ExtractionResult[] {
    const results: ExtractionResult[] = [];
    let labelRegex: RegExp;

    if (context.labels && context.labels.length > 0) {
      // Use dynamic patterns based on actual label names
      const labelNames = context.labels.map((l) =>
        l.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      );
      labelRegex = new RegExp(`@(${labelNames.join("|")})`, "gi");
    } else {
      // Fallback to static pattern
      labelRegex = /@(\w+)/g;
    }

    const matches = [...text.matchAll(labelRegex)];

    for (const match of matches) {
      const fullMatch = match[0]; // e.g., "@urgent"
      const labelName = match[1]; // e.g., "urgent"

      if (!labelName) continue;

      // Check if disabled
      if (context.disabledSections?.has(fullMatch.toLowerCase())) {
        continue;
      }

      const startIndex = match.index || 0;

      results.push({
        type: "label",
        value: labelName,
        match: fullMatch,
        startIndex,
        endIndex: startIndex + fullMatch.length,
      });
    }

    return results;
  }
}
