import { ParserResult } from "./ParserResult";
import { PriorityExtractor } from "./extractors/priority/PriorityExtractor";
import { ProjectExtractor } from "./extractors/tags/ProjectExtractor";
import { LabelExtractor } from "./extractors/tags/LabelExtractor";
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

    // Sort results by position to remove them correctly
    const sortedResults = [...results].sort(
      (a, b) => b.startIndex - a.startIndex,
    );

    for (const result of sortedResults) {
      const { type, value, match, startIndex, endIndex } = result;

      // Remove the match from the title
      parsedTask.title = this.removeMatchFromTitle(
        parsedTask.title,
        match,
        startIndex,
        endIndex,
      );

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
      }
    }

    // Clean up the title
    parsedTask.title = parsedTask.title.trim().replace(/\s+/g, " ");

    return parsedTask;
  }

  private removeMatchFromTitle(
    title: string,
    match: string,
    startIndex: number,
    endIndex: number,
  ): string {
    // Remove the match and clean up whitespace
    const before = title.slice(0, startIndex);
    const after = title.slice(endIndex);
    return `${before}${after}`;
  }
}
