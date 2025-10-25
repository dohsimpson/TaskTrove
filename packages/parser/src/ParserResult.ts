import type { ParsedTask } from "@tasktrove/parser/types";

export class ParserResult {
  constructor(public readonly parsed: ParsedTask) {}

  static empty(originalText: string): ParserResult {
    return new ParserResult({
      title: originalText.trim(),
      labels: [],
      originalText,
    });
  }
}
