import { PriorityExtractor } from "../../extractors/priority/PriorityExtractor";
import { ProjectExtractor } from "../../extractors/tags/ProjectExtractor";
import { LabelExtractor } from "../../extractors/tags/LabelExtractor";
import { DateExtractor } from "../../extractors/date/DateExtractor";
import { TimeExtractor } from "../../extractors/time/TimeExtractor";
import { RecurringExtractor } from "../../extractors/recurring/RecurringExtractor";
import { EstimationExtractor } from "../../extractors/estimation/EstimationExtractor";
import { OverlapResolver } from "../../processors/OverlapResolver";
import { LastOccurrenceSelector } from "../../processors/LastOccurrenceSelector";
import { DateTimeLinker } from "../../processors/DateTimeLinker";
import { TextCleaner } from "../../processors/TextCleaner";
import type { LocaleConfig, LocaleConfigOptions } from "../base/LocaleConfig";
import type { Extractor } from "../../extractors/base/Extractor";
import type { Processor } from "../../processors/base/Processor";

const DEFAULT_EXTRACTORS = [
  PriorityExtractor,
  ProjectExtractor,
  LabelExtractor,
  DateExtractor,
  TimeExtractor,
  RecurringExtractor,
  EstimationExtractor,
];

const DEFAULT_PROCESSORS = [
  OverlapResolver,
  LastOccurrenceSelector,
  DateTimeLinker,
  TextCleaner,
];

export class EnglishLocaleConfig implements LocaleConfig {
  readonly locale = "en";
  private options: LocaleConfigOptions;

  constructor(options: LocaleConfigOptions = {}) {
    this.options = options;
  }

  getExtractors(): Extractor[] {
    // Create instances first
    let instances: Extractor[] = DEFAULT_EXTRACTORS.map(
      (Extractor) => new Extractor(),
    );

    // Filter out disabled extractors by checking their names
    if (this.options.disabledExtractors) {
      instances = instances.filter(
        (extractor) =>
          !this.options.disabledExtractors?.includes(extractor.name),
      );
    }

    // Apply custom order if specified
    if (this.options.extractorOrder) {
      const ordered: Extractor[] = [];
      const remaining = [...instances];

      for (const name of this.options.extractorOrder) {
        const index = remaining.findIndex((e) => e.name === name);
        if (index !== -1) {
          const extractor = remaining[index];
          if (extractor) {
            ordered.push(extractor);
            remaining.splice(index, 1);
          }
        }
      }
      ordered.push(...remaining);
      instances = ordered;
    }

    return instances;
  }

  getProcessors(): Processor[] {
    let processors = DEFAULT_PROCESSORS;

    // Apply custom order if specified
    if (this.options.processorOrder) {
      const ordered: Processor[] = [];
      const remaining = processors.map((Processor) => new Processor());

      for (const name of this.options.processorOrder) {
        const index = remaining.findIndex((p) => p.name === name);
        if (index !== -1) {
          const processor = remaining[index];
          if (processor) {
            ordered.push(processor);
            remaining.splice(index, 1);
          }
        }
      }
      ordered.push(...remaining);
      return ordered;
    }

    return processors.map((Processor) => new Processor());
  }
}
