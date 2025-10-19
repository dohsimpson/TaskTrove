import type { Processor } from "./base/Processor";
import type { ExtractionResult, ParserContext } from "../types";

// Types that should be removed from title when cleaning
const REMOVAL_TYPES = new Set([
  "priority",
  "project",
  "label",
  "time",
  "date",
  "recurring",
]);

// Types that should be kept (not removed from title)
const KEEP_TYPES = new Set(["estimation", "duration"]);

export class TextCleaner implements Processor {
  readonly name = "text-cleaner";

  process(
    results: ExtractionResult[],
    _context: ParserContext,
  ): ExtractionResult[] {
    // Keep results that should not be removed from title
    return results.filter((result) => !REMOVAL_TYPES.has(result.type));
  }
}
