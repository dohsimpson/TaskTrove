import type { Processor } from "./base/Processor";
import type { ExtractionResult, ParserContext } from "../types";

const MAX_DISTANCE = 20; // Maximum characters between date and time to consider them related

export class DateTimeLinker implements Processor {
  readonly name = "datetime-linker";

  process(
    results: ExtractionResult[],
    _context: ParserContext,
  ): ExtractionResult[] {
    const dateResults = results.filter((r) => r.type === "date");
    const timeResults = results.filter((r) => r.type === "time");
    const otherResults = results.filter(
      (r) => r.type !== "date" && r.type !== "time",
    );

    const processed: ExtractionResult[] = [];
    const usedDateIndices = new Set<number>();
    const usedTimeIndices = new Set<number>();

    // Sort dates by position to process in order
    const sortedDates = [...dateResults].sort(
      (a, b) => a.startIndex - b.startIndex,
    );

    // For each date, find the closest unused time
    for (const dateResult of sortedDates) {
      const dateIndex = dateResults.indexOf(dateResult);
      if (usedDateIndices.has(dateIndex)) continue;

      let bestMatch: ExtractionResult | null = null;
      let bestTimeIndex = -1;
      let minDistance = MAX_DISTANCE + 1;

      // Find the closest unused time result
      for (let timeIndex = 0; timeIndex < timeResults.length; timeIndex++) {
        if (usedTimeIndices.has(timeIndex)) continue;

        const timeResult = timeResults[timeIndex];
        const distance = this.calculateDistance(dateResult, timeResult);

        if (distance <= MAX_DISTANCE && distance < minDistance) {
          minDistance = distance;
          bestMatch = timeResult;
          bestTimeIndex = timeIndex;
        }
      }

      if (bestMatch) {
        // Combine date and time
        const combined = this.combineDateTime(dateResult, bestMatch);
        processed.push(combined);
        usedDateIndices.add(dateIndex);
        usedTimeIndices.add(bestTimeIndex);
      } else {
        // No nearby time, keep date as-is
        processed.push(dateResult);
        usedDateIndices.add(dateIndex);
      }
    }

    // Add any unused time results
    for (let timeIndex = 0; timeIndex < timeResults.length; timeIndex++) {
      if (!usedTimeIndices.has(timeIndex)) {
        processed.push(timeResults[timeIndex]);
      }
    }

    // Add all other results, sorted by original position
    const otherResultsSorted = [...otherResults].sort(
      (a, b) => a.startIndex - b.startIndex,
    );
    processed.push(...otherResultsSorted);

    // Sort final results by position
    return processed.sort((a, b) => a.startIndex - b.startIndex);
  }

  private calculateDistance(
    dateResult: ExtractionResult,
    timeResult: ExtractionResult,
  ): number {
    // Calculate the distance between date and time
    if (dateResult.endIndex < timeResult.startIndex) {
      // Time comes after date
      return timeResult.startIndex - dateResult.endIndex;
    } else if (timeResult.endIndex < dateResult.startIndex) {
      // Time comes before date
      return dateResult.startIndex - timeResult.endIndex;
    } else {
      // Overlapping (shouldn't happen with proper processors)
      return 0;
    }
  }

  private combineDateTime(
    dateResult: ExtractionResult,
    timeResult: ExtractionResult,
  ): ExtractionResult {
    const dateValue = dateResult.value as Date;
    const timeValue = timeResult.value as string;

    // Parse time to get hours and minutes
    const [hours, minutes] = timeValue.split(":").map(Number);

    // Combine date and time
    const combinedDate = new Date(dateValue);
    combinedDate.setHours(hours || 0, minutes || 0, 0, 0);

    // Determine the combined match and position
    let combinedMatch: string;
    let startIndex: number;
    let endIndex: number;

    if (dateResult.endIndex < timeResult.startIndex) {
      // Date comes before time
      combinedMatch = this.getCombinedText(dateResult, timeResult);
      startIndex = dateResult.startIndex;
      endIndex = timeResult.endIndex;
    } else {
      // Time comes before date
      combinedMatch = this.getCombinedText(timeResult, dateResult);
      startIndex = timeResult.startIndex;
      endIndex = dateResult.endIndex;
    }

    return {
      type: "date",
      value: combinedDate,
      match: combinedMatch,
      startIndex,
      endIndex,
    };
  }

  private getCombinedText(
    first: ExtractionResult,
    second: ExtractionResult,
  ): string {
    const firstEnd = first.endIndex;
    const secondStart = second.startIndex;

    // If there's a gap, include the original text between them
    if (secondStart > firstEnd) {
      // Note: We don't have access to the original text here, so we'll use a simpler approach
      // In practice, the Pipeline should handle getting the original text between positions
      return `${first.match} ${second.match}`;
    } else {
      // Adjacent or overlapping
      return `${first.match}${second.match}`;
    }
  }
}
