import type { ExtractionResult, ParserContext } from "../../types";

export interface Extractor {
  readonly name: string;
  readonly type: string;
  extract(text: string, context: ParserContext): ExtractionResult[];
}
