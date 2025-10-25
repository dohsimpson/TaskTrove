import type { ExtractionResult, ParserContext } from "@tasktrove/parser/types";

export interface Processor {
  readonly name: string;
  process(
    results: ExtractionResult[],
    context: ParserContext,
  ): ExtractionResult[];
}
