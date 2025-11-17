import type { ParsedTask, ExtractionResult } from "@tasktrove/parser/types";

export class ParserResult {
  constructor(
    public readonly parsed: ParsedTask,
    public readonly matches: ExtractionResult[],
    public readonly rawMatches: ExtractionResult[],
  ) {}

  static empty(originalText: string): ParserResult {
    return new ParserResult(
      {
        title: originalText.trim(),
        labels: [],
        originalText,
      },
      [],
      [],
    );
  }
}
