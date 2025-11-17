import { ParserResult } from "../ParserResult";
import { PriorityExtractor } from "../extractors/priority/PriorityExtractor";
import { ProjectExtractor } from "../extractors/tags/ProjectExtractor";
import { LabelExtractor } from "../extractors/tags/LabelExtractor";
import { DateExtractor } from "../extractors/date/DateExtractor";
import { WeekdayExtractor } from "../extractors/date/WeekdayExtractor";
import { DurationDateExtractor } from "../extractors/date/DurationDateExtractor";
import { TimeExtractor } from "../extractors/time/TimeExtractor";
import { RecurringExtractor } from "../extractors/recurring/RecurringExtractor";
import { EstimationExtractor } from "../extractors/estimation/EstimationExtractor";
import { DurationExtractor } from "../extractors/duration/DurationExtractor";
import { OverlapResolver } from "../processors/OverlapResolver";
import { LastOccurrenceSelector } from "../processors/LastOccurrenceSelector";
import { DateTimeSplitter } from "../processors/DateTimeSplitter";
import { TimeToDateProcessor } from "../processors/TimeToDateProcessor";
import type { Extractor } from "@tasktrove/parser/extractors/base";
import type { Processor } from "../processors/base/Processor";
import type {
  ParserContext,
  ParsedTask,
  ExtractionResult,
} from "@tasktrove/parser/types";

export class TaskParser {
  private extractors: Extractor[];
  private processors: Processor[];

  constructor() {
    this.extractors = this.createExtractors();
    this.processors = this.createProcessors();
  }

  protected createExtractors(): Extractor[] {
    return [
      new PriorityExtractor(),
      new ProjectExtractor(),
      new LabelExtractor(),
      new DateExtractor(),
      new WeekdayExtractor(),
      new DurationDateExtractor(),
      new TimeExtractor(),
      new RecurringExtractor(),
      new EstimationExtractor(),
      new DurationExtractor(),
    ];
  }

  protected createProcessors(): Processor[] {
    return [
      new OverlapResolver(),
      new LastOccurrenceSelector(),
      new TimeToDateProcessor(),
      new DateTimeSplitter(),
    ];
  }

  parse(text: string, context: ParserContext): ParserResult {
    // Step 1: Extract all results
    let extractionResults: ExtractionResult[] = [];
    for (const extractor of this.extractors) {
      const results = extractor.extract(text, context);
      extractionResults.push(...results);
    }

    // Step 2: Process results (resolve overlaps, select last occurrences, etc.)
    let processedResults = extractionResults;
    for (const processor of this.processors) {
      processedResults = processor.process(processedResults, context);
    }

    // Step 3: Convert to ParsedTask
    // Use original extraction results for text cleaning (so all matched patterns are removed)
    // Use processed results for values (so duplicates/overlaps are resolved)
    const parsedTask = this.convertToParsedTask(
      text,
      processedResults,
      extractionResults,
    );

    return new ParserResult(parsedTask, processedResults, extractionResults);
  }

  protected convertToParsedTask(
    originalText: string,
    processedResults: ExtractionResult[],
    originalResults: ExtractionResult[],
  ): ParsedTask {
    const parsedTask: ParsedTask = {
      title: originalText,
      labels: [],
      originalText,
    };

    // Apply values from processed results (duplicates/overlaps resolved)
    for (const result of processedResults) {
      const { type, value } = result;

      switch (type) {
        case "priority":
          parsedTask.priority = value as number;
          break;
        case "project":
          parsedTask.project = value as string;
          break;
        case "label":
          parsedTask.labels.push(value as string);
          break;
        case "date":
          parsedTask.dueDate = value as Date;
          break;
        case "time":
          parsedTask.time = value as string;
          break;
        case "recurring":
          parsedTask.recurring = value as string;
          break;
        case "estimation":
          parsedTask.estimation = value as number;
          break;
        case "duration":
          parsedTask.duration = value as string;
          break;
      }
    }

    // Clean title using original results, but preserve dates for readability
    let cleanText = originalText;
    const sortedOriginalResults = [...originalResults].sort(
      (a, b) => b.startIndex - a.startIndex,
    );

    for (const result of sortedOriginalResults) {
      const { type, match, startIndex, endIndex } = result;

      // Dates should also be removed from title
      // (Commented out the skip logic that was preserving dates)

      // Remove the match from the title (all other patterns should be removed)
      // Replace matched text with spaces to preserve positions of other matches
      cleanText =
        cleanText.substring(0, startIndex) +
        " ".repeat(match.length) +
        cleanText.substring(endIndex);
    }

    // Clean up the title by removing extra spaces
    parsedTask.title = cleanText.replace(/\s+/g, " ").trim();

    return parsedTask;
  }
}
