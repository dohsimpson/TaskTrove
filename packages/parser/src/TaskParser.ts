import { ParserResult } from "./ParserResult";
import { PriorityExtractor } from "./extractors/priority/PriorityExtractor";
import { ProjectExtractor } from "./extractors/tags/ProjectExtractor";
import { LabelExtractor } from "./extractors/tags/LabelExtractor";
import { DateExtractor } from "./extractors/date/DateExtractor";
import { TimeExtractor } from "./extractors/time/TimeExtractor";
import { RecurringExtractor } from "./extractors/recurring/RecurringExtractor";
import { EstimationExtractor } from "./extractors/estimation/EstimationExtractor";
import { OverlapResolver } from "./processors/OverlapResolver";
import { LastOccurrenceSelector } from "./processors/LastOccurrenceSelector";
import type { Extractor } from "./extractors/base/Extractor";
import type { Processor } from "./processors/base/Processor";
import type { ParserContext, ParsedTask, ExtractionResult } from "./types";

export class TaskParser {
  private extractors: Extractor[] = [
    new PriorityExtractor(),
    new ProjectExtractor(),
    new LabelExtractor(),
    new DateExtractor(),
    new TimeExtractor(),
    new RecurringExtractor(),
    new EstimationExtractor(),
  ];

  private processors: Processor[] = [
    new OverlapResolver(),
    new LastOccurrenceSelector(),
  ];

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
    const parsedTask = this.convertToParsedTask(text, processedResults);

    return new ParserResult(parsedTask);
  }

  private convertToParsedTask(
    originalText: string,
    results: ExtractionResult[],
  ): ParsedTask {
    const parsedTask: ParsedTask = {
      title: originalText,
      labels: [],
      originalText,
    };

    let cleanText = originalText;

    // Sort results by startIndex for processing in reverse order
    const sortedResults = [...results].sort(
      (a, b) => b.startIndex - a.startIndex,
    );

    // Extract values and remove patterns from title (process in reverse order to preserve indices)
    for (const result of sortedResults) {
      const { type, value, match, startIndex, endIndex } = result;

      // Apply the extracted value to the parsed task
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

      // Remove the match from the title (dates should remain for readability)
      if (type !== "date") {
        // Replace matched text with spaces to preserve positions of other matches
        cleanText =
          cleanText.substring(0, startIndex) +
          " ".repeat(match.length) +
          cleanText.substring(endIndex);
      }
    }

    // Clean up the title by removing extra spaces
    parsedTask.title = cleanText.replace(/\s+/g, " ").trim();

    return parsedTask;
  }
}
