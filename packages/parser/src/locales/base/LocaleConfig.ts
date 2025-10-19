import type { Extractor } from "../../extractors/base/Extractor";
import type { Processor } from "../../processors/base/Processor";

export interface LocaleConfigOptions {
  disabledExtractors?: string[];
  extractorOrder?: string[];
  processorOrder?: string[];
}

export interface LocaleConfig {
  readonly locale: string;
  getExtractors(): Extractor[];
  getProcessors(): Processor[];
}
