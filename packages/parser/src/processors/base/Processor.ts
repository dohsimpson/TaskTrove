import type { ExtractionResult, ParserContext } from "../../types";

export interface Processor {
  readonly name: string;
  process(
    results: ExtractionResult[],
    context: ParserContext,
  ): ExtractionResult[];
}
